import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BACKUP_FORMAT, buildBackup, parseBackup } from "./backup";
import { emptyState } from "./learning/state";
import { addCards, addDeck, addNote } from "./space/library";
import { emptySpace, setProfile } from "./space/space";

const env = (() => { let n = 0; return { now: 5, id: () => `id${String(++n).padStart(4, "0")}` }; })();

function richSpace() {
  let s = setProfile(emptySpace(1), { name: "Vũ", goal: "N5" });
  s = addNote(s, { title: "Ghi chú", body: "は = wa" }, env).space;
  const d = addDeck(s, "Bộ", env);
  s = addCards(d.space, d.deck.id, [{ front: "水", back: "nước" }], env).space;
  return s;
}

describe("tệp sao lưu bọc (định dạng 2)", () => {
  it("vòng xuất → nhập giữ nguyên cả tiến độ lẫn không gian riêng", () => {
    const space = richSpace();
    const text = buildBackup(emptyState(), space, new Date("2026-10-05T00:00:00Z"));
    const parsed = JSON.parse(text);
    expect(parsed).toMatchObject({ app: "kana-dojo", format: BACKUP_FORMAT, exportedAt: "2026-10-05T00:00:00.000Z" });

    const r = parseBackup(text);
    expect(r.ok && r.kind === "full" && r.space).toEqual(space);
    expect(r.ok && r.progress).toEqual(emptyState());
  });

  it("phần progress bên trong là ProgressState v1 nguyên vẹn (hợp đồng web ↔ mobile không đổi)", () => {
    const parsed = JSON.parse(buildBackup(emptyState(), emptySpace()));
    expect(parsed.progress).toEqual(emptyState());
    expect(parsed.progress.version).toBe(1);
  });
});

describe("tương thích tệp cũ", () => {
  it("tệp tiến độ trần của bản cũ vẫn nhập được, chỉ có phần tiến độ", () => {
    const r = parseBackup(JSON.stringify(emptyState()));
    expect(r).toMatchObject({ ok: true, kind: "progress-only" });
  });

  it("tệp tiến độ cũ sai hình dạng bị từ chối với thông báo cũ", () => {
    expect(parseBackup('{"version":1}')).toMatchObject({ ok: false, error: expect.stringContaining("tiến độ") });
  });
});

describe("từ chối tệp không dùng được", () => {
  it("JSON hỏng", () => {
    expect(parseBackup("{")).toMatchObject({ ok: false, error: expect.stringContaining("JSON") });
  });

  it("định dạng mới hơn bản đang chạy (không đoán)", () => {
    const text = JSON.stringify({ app: "kana-dojo", format: BACKUP_FORMAT + 1 });
    expect(parseBackup(text)).toMatchObject({ ok: false, error: expect.stringContaining("mới hơn") });
  });

  it("không phải tệp của Kana Dōjō", () => {
    const text = JSON.stringify({ app: "other", format: BACKUP_FORMAT, progress: emptyState(), space: emptySpace() });
    expect(parseBackup(text)).toMatchObject({ ok: false });
  });

  it("phần space hỏng thì cả tệp bị từ chối — không nhập nửa vời", () => {
    const text = JSON.stringify({ app: "kana-dojo", format: BACKUP_FORMAT, progress: emptyState(), space: { version: 1 } });
    expect(parseBackup(text)).toMatchObject({ ok: false, error: expect.stringContaining("không gian riêng") });
  });

  it("phần progress hỏng thì cả tệp bị từ chối", () => {
    const text = JSON.stringify({ app: "kana-dojo", format: BACKUP_FORMAT, progress: { version: 1 }, space: emptySpace() });
    expect(parseBackup(text)).toMatchObject({ ok: false, error: expect.stringContaining("tiến độ") });
  });
});

describe("nhập/xuất qua kho thật", () => {
  class FakeStorage {
    data = new Map<string, string>();
    /** Khoá ghi thất bại như khi hết dung lượng. */
    full = new Set<string>();
    getItem = (k: string) => this.data.get(k) ?? null;
    setItem = (k: string, v: string) => {
      if (this.full.has(k)) throw new DOMException("quota", "QuotaExceededError");
      this.data.set(k, v);
    };
    removeItem = (k: string) => void this.data.delete(k);
    key = (i: number) => [...this.data.keys()][i] ?? null;
    get length() { return this.data.size; }
  }
  let ls: FakeStorage;

  beforeEach(() => {
    ls = new FakeStorage();
    vi.stubGlobal("window", { localStorage: ls, addEventListener: () => {} });
    vi.resetModules();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("xuất từ máy này, nhập vào máy khác: tài liệu và tiến độ sang đủ", async () => {
    const a = await import("./backup");
    const as = await import("./space/store");
    const al = await import("./learning/store");
    as.replaceSpace(richSpace());
    al.recordWritingAttempt({ character: "あ", avgScore: 95, strokeErrors: [], durationMs: 3000 });
    const file = a.exportBackup();

    ls.data.clear();
    vi.resetModules();
    const b = await import("./backup");
    const bs = await import("./space/store");
    const bl = await import("./learning/store");
    expect(b.importBackup(file)).toEqual({ ok: true, kind: "full" });
    expect(bs.getSpace().library.notes[0].title).toBe("Ghi chú");
    expect(bs.getSpace().profile.name).toBe("Vũ");
    expect(bl.getState().cards["KANA_WRITING:あ"]).toBeDefined();
  });

  it("nhập tệp cũ chỉ thay tiến độ, KHÔNG đụng tài liệu hiện có", async () => {
    const b = await import("./backup");
    const bs = await import("./space/store");
    const bl = await import("./learning/store");
    bs.replaceSpace(richSpace());
    const legacy = JSON.stringify({ ...emptyState(), stats: { ...emptyState().stats, xpTotal: 777 } });
    expect(b.importBackup(legacy)).toEqual({ ok: true, kind: "progress-only" });
    expect(bl.getState().stats.xpTotal).toBe(777);
    expect(bs.getSpace().library.notes).toHaveLength(1);
  });

  it("tệp hỏng không làm mất gì của dữ liệu hiện có", async () => {
    const b = await import("./backup");
    const bs = await import("./space/store");
    const bl = await import("./learning/store");
    bs.replaceSpace(richSpace());
    bl.recordWritingAttempt({ character: "い", avgScore: 90, strokeErrors: [], durationMs: 1000 });
    const bad = JSON.stringify({ app: "kana-dojo", format: BACKUP_FORMAT, progress: emptyState(), space: { version: 1 } });
    expect(b.importBackup(bad)).toMatchObject({ ok: false });
    expect(bs.getSpace().library.notes).toHaveLength(1);
    expect(bl.getState().cards["KANA_WRITING:い"]).toBeDefined();
  });

  it("resetLearning xoá việc học nhưng giữ tài liệu; resetEverything xoá cả hai", async () => {
    const b = await import("./backup");
    const bs = await import("./space/store");
    const bl = await import("./learning/store");
    bs.replaceSpace(richSpace());
    bl.recordWritingAttempt({ character: "あ", avgScore: 95, strokeErrors: [], durationMs: 3000 });

    b.resetLearning();
    expect(bl.getState().stats.xpTotal).toBe(0);
    expect(bs.getSpace().library.notes).toHaveLength(1);

    b.resetEverything();
    expect(bs.getSpace().library.notes).toHaveLength(0);
    expect(bs.getSpace().onboarded).toBe(false);
  });

  it("xoá việc học bỏ cả bản tiến độ hỏng; xoá sạch bỏ mọi khoá kd.* trừ giao diện sáng/tối", async () => {
    const b = await import("./backup");
    for (const k of ["kd.progress.corrupt", "kd.space.corrupt", "kd.typing.config", "kd.theme", "other.app"]) ls.data.set(k, "x");

    b.resetLearning();
    expect(ls.data.has("kd.progress.corrupt")).toBe(false);
    expect(ls.data.has("kd.space.corrupt")).toBe(true); // tài liệu và cài đặt được giữ
    expect(ls.data.has("kd.typing.config")).toBe(true);

    b.resetEverything();
    expect([...ls.data.keys()].sort()).toEqual(["kd.progress.v1", "kd.space.v1", "kd.theme", "other.app"]);
  });

  describe("khôi phục là tất cả hoặc không gì cả", () => {
    async function withData() {
      const b = await import("./backup");
      const bs = await import("./space/store");
      const bl = await import("./learning/store");
      bs.replaceSpace(richSpace());
      bl.recordWritingAttempt({ character: "い", avgScore: 90, strokeErrors: [], durationMs: 1000 });
      const file = buildBackup({ ...emptyState(), stats: { ...emptyState().stats, xpTotal: 777 } }, emptySpace());
      const saved = { progress: ls.data.get("kd.progress.v1"), space: ls.data.get("kd.space.v1") };
      return { b, bs, bl, file, saved };
    }

    it("không ghi được không gian riêng: tiến độ không bị đụng tới", async () => {
      const { b, bs, bl, file, saved } = await withData();
      ls.full.add("kd.space.v1");
      expect(b.importBackup(file)).toMatchObject({ ok: false, error: expect.stringContaining("dung lượng") });
      expect(bl.getState().cards["KANA_WRITING:い"]).toBeDefined();
      expect(bs.getSpace().library.notes).toHaveLength(1);
      expect(ls.data.get("kd.progress.v1")).toBe(saved.progress);
      expect(ls.data.get("kd.space.v1")).toBe(saved.space);
    });

    it("không ghi được tiến độ sau khi đã ghi không gian riêng: không gian riêng được hoàn lại", async () => {
      const { b, bs, bl, file, saved } = await withData();
      ls.full.add("kd.progress.v1");
      expect(b.importBackup(file)).toMatchObject({ ok: false });
      expect(bl.getState().stats.xpTotal).not.toBe(777);
      expect(bs.getSpace().library.notes).toHaveLength(1);
      expect(ls.data.get("kd.progress.v1")).toBe(saved.progress);
      expect(ls.data.get("kd.space.v1")).toBe(saved.space);
      expect(bs.isPersistent()).toBe(true);
    });

    it("trình duyệt vốn đã không lưu được: vẫn khôi phục vào bộ nhớ như trước", async () => {
      vi.stubGlobal("window", { get localStorage(): Storage { throw new DOMException("blocked", "SecurityError"); }, addEventListener: () => {} });
      const b = await import("./backup");
      const bl = await import("./learning/store");
      expect(b.importBackup(buildBackup({ ...emptyState(), stats: { ...emptyState().stats, xpTotal: 777 } }, emptySpace())))
        .toEqual({ ok: true, kind: "full" });
      expect(bl.getState().stats.xpTotal).toBe(777);
    });

    it("tab cũ gặp dữ liệu của phiên bản mới hơn: từ chối khôi phục, không ghi gì", async () => {
      const newer = JSON.stringify({ ...emptyState(), version: 99 });
      ls.data.set("kd.progress.v1", newer);
      const b = await import("./backup");
      expect(b.importBackup(buildBackup(emptyState(), emptySpace()))).toMatchObject({ ok: false, error: expect.stringContaining("đóng mọi tab") });
      expect(ls.data.get("kd.progress.v1")).toBe(newer);
      expect(ls.data.has("kd.space.v1")).toBe(false);
    });
  });
});
