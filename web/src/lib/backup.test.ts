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
    getItem = (k: string) => this.data.get(k) ?? null;
    setItem = (k: string, v: string) => void this.data.set(k, v);
    removeItem = (k: string) => void this.data.delete(k);
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
});
