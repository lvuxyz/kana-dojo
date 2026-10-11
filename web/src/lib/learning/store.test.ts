import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STATE_VERSION, emptyState, parseState } from "./state";

/** localStorage giả — chạy trong Node, không cần jsdom. */
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

/** Nạp lại module store như thể người dùng mở trang mới (state nằm ở biến cấp module). */
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

afterEach(() => {
  vi.unstubAllGlobals();
});

const attempt = { character: "あ", avgScore: 95, strokeErrors: [], durationMs: 3000 };

describe("kho tiến độ localStorage", () => {
  it("lần đầu mở: trạng thái rỗng, tham chiếu ổn định giữa các lần đọc", async () => {
    const store = await freshStore();
    const s = store.getState();
    expect(s).toEqual(emptyState());
    expect(s).not.toBe(store.SERVER_STATE); // để hook biết dữ liệu thật đã sẵn sàng
    expect(store.getState()).toBe(s);
    expect(store.getServerState()).toBe(store.SERVER_STATE);
  });

  it("lưu sau mỗi thao tác và còn nguyên khi mở lại trang", async () => {
    const a = await freshStore();
    const res = a.recordWritingAttempt(attempt);
    expect(res.passed).toBe(true);
    expect(ls.data.has(a.STORAGE_KEY)).toBe(true);

    const b = await freshStore(); // "tải lại trang"
    expect(b.getState().stats.xpTotal).toBe(25);
    expect(b.getState().cards["KANA_WRITING:あ"]).toBeDefined();
    expect(b.getState().badges.FIRST_STROKE).toBeTypeOf("number");
  });

  it("báo cho người nghe khi trạng thái đổi", async () => {
    const store = await freshStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.recordWritingAttempt(attempt);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.setDailyGoal(100);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("thao tác lỗi không làm hỏng trạng thái đã lưu", async () => {
    const store = await freshStore();
    store.recordWritingAttempt(attempt);
    const before = ls.getItem(store.STORAGE_KEY);

    expect(() => store.recordWritingAttempt({ ...attempt, character: "Z" })).toThrow();
    expect(() => store.gradeReviewCard("rác", 3)).toThrow();
    expect(ls.getItem(store.STORAGE_KEY)).toBe(before);
  });

  it("dữ liệu hỏng: bắt đầu lại từ rỗng nhưng giữ bản hỏng để cứu hộ", async () => {
    ls.setItem("kd.progress.v1", '{"version":1,"stats":"hỏng"}');
    const store = await freshStore();

    expect(store.getState()).toEqual(emptyState());
    expect(ls.getItem("kd.progress.corrupt")).toBe('{"version":1,"stats":"hỏng"}');
  });

  it("trình duyệt chặn ghi: vẫn học được trong bộ nhớ và báo không lưu được", async () => {
    ls.failWrites = true;
    const store = await freshStore();
    expect(store.isPersistent()).toBe(true); // chưa thử ghi thì chưa biết

    store.recordWritingAttempt(attempt);
    expect(store.getState().stats.xpTotal).toBe(25);
    expect(store.isPersistent()).toBe(false);

    ls.failWrites = false;
    store.setDailyGoal(60);
    expect(store.isPersistent()).toBe(true);
  });

  it("không có localStorage (bị chặn hoàn toàn) vẫn chạy được", async () => {
    vi.stubGlobal("window", {
      get localStorage(): never { throw new DOMException("denied", "SecurityError"); },
      addEventListener: () => {},
    });
    const store = await freshStore();
    expect(store.getState()).toEqual(emptyState());
    store.recordWritingAttempt(attempt);
    expect(store.getState().stats.xpTotal).toBe(25);
    expect(store.isPersistent()).toBe(false);
  });

  it("đồng bộ khi tab khác ghi: lấy bản mới nhất và báo người nghe", async () => {
    const tabA = await freshStore();
    tabA.getState(); // tab đã hiển thị trang nên đã nạp tiến độ (React đọc snapshot trước khi subscribe)
    const listener = vi.fn();
    tabA.subscribe(listener);
    const onStorage = storageHandler!;

    // Tab B (một instance khác dùng chung localStorage) ghi tiến độ
    const tabB = await freshStore();
    tabB.recordWritingAttempt(attempt);

    expect(tabA.getState().stats.xpTotal).toBe(0); // chưa nhận tin
    onStorage({ key: tabA.STORAGE_KEY });
    expect(tabA.getState().stats.xpTotal).toBe(25);
    expect(listener).toHaveBeenCalled();

    // Sự kiện của khoá khác bị bỏ qua
    listener.mockClear();
    onStorage({ key: "kd.theme" });
    expect(listener).not.toHaveBeenCalled();
  });

  describe("dữ liệu của phiên bản mới hơn (tab cũ còn mở sau khi cập nhật)", () => {
    const newerBlob = JSON.stringify({ ...emptyState(), version: STATE_VERSION + 1, stats: { ...emptyState().stats, xpTotal: 9999 } });

    it("không coi là hỏng, không bao giờ ghi đè, báo isNewerData", async () => {
      ls.setItem("kd.progress.v1", newerBlob);
      const store = await freshStore();

      expect(store.getState()).toEqual(emptyState());
      expect(store.isNewerData()).toBe(true);
      expect(store.isPersistent()).toBe(false);
      expect(ls.data.has("kd.progress.corrupt")).toBe(false);

      // Học tiếp trong bộ nhớ được, nhưng bản mới trong kho còn nguyên từng byte
      store.recordWritingAttempt(attempt);
      store.setDailyGoal(60);
      store.resetProgress();
      expect(ls.getItem("kd.progress.v1")).toBe(newerBlob);
    });

    it("tab mới ghi định dạng mới trong khi tab cũ đang mở: tab cũ dừng ghi; bản mới bị gỡ thì ghi lại bình thường", async () => {
      const old = await freshStore();
      old.recordWritingAttempt(attempt);
      old.subscribe(() => {});
      const onStorage = storageHandler!;

      ls.setItem("kd.progress.v1", newerBlob); // bản mới vừa nâng định dạng
      onStorage({ key: old.STORAGE_KEY });
      expect(old.isNewerData()).toBe(true);
      old.setDailyGoal(60);
      expect(ls.getItem("kd.progress.v1")).toBe(newerBlob);

      ls.removeItem("kd.progress.v1"); // vd. người học xoá dữ liệu trang ở bản mới
      onStorage({ key: null });
      expect(old.isNewerData()).toBe(false);
      old.setDailyGoal(70);
      expect(old.isPersistent()).toBe(true);
      expect(parseState(ls.getItem("kd.progress.v1")!)).toMatchObject({ ok: true });
    });
  });
});

describe("cài đặt và dữ liệu", () => {
  it("mục tiêu XP được kẹp trong khoảng cho phép", async () => {
    const store = await freshStore();
    store.setDailyGoal(5);
    expect(store.getState().settings.dailyGoalXp).toBe(10);
    store.setDailyGoal(100_000);
    expect(store.getState().settings.dailyGoalXp).toBe(500);
    store.setDailyGoal(Number.NaN);
    expect(store.getState().settings.dailyGoalXp).toBe(10);
    store.setDailyGoal(120);
    expect(store.getState().settings.dailyGoalXp).toBe(120);
  });

  it("xuất rồi nhập lại cho đúng trạng thái cũ", async () => {
    const a = await freshStore();
    a.recordWritingAttempt(attempt);
    a.gradeReviewCard("KANA_WRITING:い", 3, 500);
    const exported = a.exportProgress();

    const b = await freshStore();
    expect(b.importProgress(exported)).toEqual({ ok: true });
    expect(b.getState()).toEqual(a.getState());
    // và đã được lưu
    const c = await freshStore();
    expect(c.getState()).toEqual(a.getState());
  });

  it("tệp nhập sai bị từ chối và không đụng tới tiến độ hiện có", async () => {
    const store = await freshStore();
    store.recordWritingAttempt(attempt);
    const before = store.exportProgress();

    for (const bad of ["không phải json", "{}", '{"version":1}', JSON.stringify({ ...emptyState(), settings: { dailyGoalXp: 9999 } })]) {
      const r = store.importProgress(bad);
      expect(r.ok).toBe(false);
    }
    expect(store.exportProgress()).toBe(before);
  });

  it("tệp từ phiên bản mới hơn được báo rõ", () => {
    const r = parseState(JSON.stringify({ ...emptyState(), version: STATE_VERSION + 1 }));
    expect(r).toMatchObject({ ok: false });
    expect(r.ok === false && r.error).toMatch(/mới hơn/);
  });

  it("đặt lại xoá sạch tiến độ", async () => {
    const store = await freshStore();
    store.recordWritingAttempt(attempt);
    store.resetProgress();
    expect(store.getState()).toEqual(emptyState());
    expect(parseState(ls.getItem(store.STORAGE_KEY)!)).toMatchObject({ ok: true });
  });
});
