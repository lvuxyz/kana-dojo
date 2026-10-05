import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDeck, addNote } from "./library";
import { emptySpace, setProfile, setStudy } from "./space";

class FakeStorage {
  data = new Map<string, string>();
  failWrites = false;
  getItem = (k: string) => this.data.get(k) ?? null;
  setItem = (k: string, v: string) => {
    if (this.failWrites) throw new DOMException("quota", "QuotaExceededError");
    this.data.set(k, v);
  };
  removeItem = (k: string) => void this.data.delete(k);
}

let ls: FakeStorage;
let storageHandler: ((e: { key: string | null }) => void) | undefined;

/** Nạp lại module như thể người dùng mở trang mới (state nằm ở biến cấp module). */
async function freshStore() {
  vi.resetModules();
  storageHandler = undefined;
  return import("./store");
}

beforeEach(() => {
  ls = new FakeStorage();
  vi.stubGlobal("window", {
    localStorage: ls,
    addEventListener: (type: string, fn: (e: { key: string | null }) => void) => {
      if (type === "storage") storageHandler = fn;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("kho không gian riêng", () => {
  it("lần đầu mở: không gian trống, tham chiếu ổn định, KHÔNG tự ghi gì vào localStorage", async () => {
    const store = await freshStore();
    const s = store.getSpace();
    expect(s.onboarded).toBe(false);
    expect(s).not.toBe(store.SERVER_SPACE);
    expect(store.getSpace()).toBe(s);
    expect(ls.data.size).toBe(0);
  });

  it("lưu sau mỗi thay đổi và còn nguyên khi mở lại trang", async () => {
    const a = await freshStore();
    expect(a.updateSpace((s) => setProfile(s, { name: "Vũ" }))).toEqual({ ok: true });
    expect(a.updateSpace((s) => addNote(s, { title: "Trợ từ", body: "は = wa" }).space)).toEqual({ ok: true });
    expect(ls.data.has(a.SPACE_KEY)).toBe(true);

    const b = await freshStore();
    expect(b.getSpace().profile.name).toBe("Vũ");
    expect(b.getSpace().library.notes[0]).toMatchObject({ title: "Trợ từ", body: "は = wa" });
  });

  it("báo cho người nghe khi đổi, và không báo khi thao tác không đổi gì", async () => {
    const store = await freshStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.updateSpace((s) => setProfile(s, { name: "A" }));
    expect(listener).toHaveBeenCalledTimes(1);
    store.updateSpace((s) => s);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("thao tác ném SpaceError: trả lỗi tiếng Việt, không đổi gì, không ghi", async () => {
    const store = await freshStore();
    // Import trong cùng đồ thị module với store (sau resetModules) để SpaceError là cùng một lớp.
    const lib = await import("./library");
    const before = store.getSpace();
    const res = store.updateSpace((s) => lib.addText(s, { text: "abc" }).space);
    expect(res).toMatchObject({ ok: false, error: expect.stringContaining("không gõ được") });
    expect(store.getSpace()).toBe(before);
    expect(ls.data.size).toBe(0);
  });

  it("lỗi lập trình (không phải SpaceError) không bị nuốt", async () => {
    const store = await freshStore();
    expect(() => store.updateSpace(() => { throw new TypeError("bug"); })).toThrow(TypeError);
  });

  it("dữ liệu hỏng được giữ lại ở khoá .corrupt, rồi bắt đầu từ không gian trống", async () => {
    ls.data.set("kd.space.v1", "{không phải json");
    const store = await freshStore();
    expect(store.getSpace().onboarded).toBe(false);
    expect(ls.data.get(store.SPACE_CORRUPT_KEY)).toBe("{không phải json");
  });

  it("đồng bộ nhiều tab: tab khác ghi thì tab này thấy bản mới", async () => {
    const store = await freshStore();
    store.getSpace();
    const listener = vi.fn();
    store.subscribe(listener);

    const other = setProfile(emptySpace(), { name: "Từ tab khác" });
    ls.data.set(store.SPACE_KEY, JSON.stringify(other));
    storageHandler?.({ key: store.SPACE_KEY });
    expect(store.getSpace().profile.name).toBe("Từ tab khác");
    expect(listener).toHaveBeenCalled();

    storageHandler?.({ key: "kd.theme" }); // khoá không liên quan: bỏ qua
    expect(store.getSpace().profile.name).toBe("Từ tab khác");
  });

  it("đầy bộ nhớ: vẫn chạy trong bộ nhớ nhưng lộ ra isPersistent = false; ghi lại được thì tự khỏi", async () => {
    const store = await freshStore();
    expect(store.isPersistent()).toBe(true);
    ls.failWrites = true;
    store.updateSpace((s) => setProfile(s, { name: "Chưa lưu được" }));
    expect(store.getSpace().profile.name).toBe("Chưa lưu được");
    expect(store.isPersistent()).toBe(false);
    ls.failWrites = false;
    store.updateSpace((s) => setProfile(s, { name: "Lưu được rồi" }));
    expect(store.isPersistent()).toBe(true);
  });

  it("trình duyệt chặn hẳn localStorage: chạy trong bộ nhớ, isPersistent = false", async () => {
    vi.stubGlobal("window", { get localStorage(): Storage { throw new DOMException("blocked", "SecurityError"); }, addEventListener: () => {} });
    const store = await freshStore();
    store.updateSpace((s) => setProfile(s, { name: "x" }));
    expect(store.getSpace().profile.name).toBe("x");
    expect(store.isPersistent()).toBe(false);
  });

  it("reset: về không gian trống, chưa dựng", async () => {
    const store = await freshStore();
    store.updateSpace((s) => ({ ...setProfile(s, { name: "A" }), onboarded: true }));
    store.resetSpace();
    expect(store.getSpace()).toMatchObject({ onboarded: false, profile: { name: "" } });
  });
});

describe("ngữ cảnh học từ không gian", () => {
  it("cùng một tham chiếu chừng nào không gian chưa đổi; đổi thì dựng lại", async () => {
    const store = await freshStore();
    const a = store.getLearnContext();
    expect(store.getLearnContext()).toBe(a);
    store.updateSpace((s) => setStudy(s, { newCardsPerDay: 3 }));
    const b = store.getLearnContext();
    expect(b).not.toBe(a);
    expect(b.study.newCardsPerDay).toBe(3);
  });

  it("chỉ gồm bộ thẻ đang bật", async () => {
    const store = await freshStore();
    store.updateSpace((s) => {
      const d = addDeck(s, "Bộ", { now: 1, id: (() => { let n = 0; return () => `id${++n}aaaa`; })() });
      return d.space;
    });
    expect(store.getLearnContext().catalog.cards.size).toBe(0);
  });
});
