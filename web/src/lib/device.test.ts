import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEVICE_KEY, PERSIST_ASK_EVERY_MS, REMIND_AFTER_MS, SNOOZE_MS, emptyDevice, parseDevice, shouldAskPersist,
  shouldRemindBackup, studyDaysSince, type DeviceNotes,
} from "./device";
import { emptyState, type ProgressState } from "./learning/state";
import { DAY_MS } from "./learning/time";

const zone = "Asia/Ho_Chi_Minh";
/** 2026-10-12 12:00 giờ VN */
const NOW = Date.UTC(2026, 9, 12, 5);

function studied(...days: string[]): ProgressState {
  const s = emptyState();
  for (const d of days) s.daily[d] = { xp: 10, reviews: 1, chars: 0, studyMs: 1000, goalMet: false };
  return s;
}

const notes = (patch: Partial<DeviceNotes> = {}): DeviceNotes => ({ ...emptyDevice(), ...patch });

describe("nhắc sao lưu", () => {
  it("chưa sao lưu lần nào: nhắc khi đã học đủ 3 ngày, không nhắc người mới học thử", () => {
    expect(shouldRemindBackup(studied("2026-10-10", "2026-10-11"), notes(), { now: NOW, zone })).toBe(false);
    expect(shouldRemindBackup(studied("2026-10-10", "2026-10-11", "2026-10-12"), notes(), { now: NOW, zone })).toBe(true);
  });

  it("chỉ đếm ngày học SAU ngày sao lưu, theo giờ máy", () => {
    const backup = Date.UTC(2026, 9, 1, 18); // 01:00 ngày 02/10 giờ VN (vẫn là 01/10 theo UTC)
    const s = studied("2026-10-01", "2026-10-02", "2026-10-05", "2026-10-09");
    expect(studyDaysSince(s, backup, zone)).toBe(2);
    expect(studyDaysSince(s, null, zone)).toBe(4);
  });

  it("sao lưu chưa đủ 7 ngày thì không nhắc, dù đã học nhiều ngày", () => {
    const s = studied("2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12");
    const recent = notes({ lastBackupAt: NOW - REMIND_AFTER_MS + DAY_MS });
    expect(shouldRemindBackup(s, recent, { now: NOW, zone })).toBe(false);
    const old = notes({ lastBackupAt: NOW - REMIND_AFTER_MS });
    expect(shouldRemindBackup(s, old, { now: NOW, zone })).toBe(true);
  });

  it("sao lưu cũ nhưng gần như không học thêm: không nhắc", () => {
    const s = studied("2026-09-01", "2026-09-02", "2026-09-03", "2026-10-12");
    expect(shouldRemindBackup(s, notes({ lastBackupAt: Date.UTC(2026, 8, 10) }), { now: NOW, zone })).toBe(false);
  });

  it("“Để sau” im lặng đúng một khoảng rồi nhắc lại", () => {
    const s = studied("2026-10-10", "2026-10-11", "2026-10-12");
    const snoozed = notes({ backupSnoozeUntil: NOW + 1 });
    expect(shouldRemindBackup(s, snoozed, { now: NOW, zone })).toBe(false);
    expect(shouldRemindBackup(s, snoozed, { now: NOW + 1, zone })).toBe(true);
    expect(SNOOZE_MS).toBe(7 * DAY_MS);
  });
});

describe("tự xin lưu bền", () => {
  const learning = () => {
    const s = emptyState();
    s.cards["KANA_READING:あ"] = {
      itemType: "KANA_READING", itemId: "あ", state: "LEARNING", stability: 1, difficulty: 5, dueAt: NOW,
      lastReviewedAt: NOW, reps: 1, lapses: 0, learningStep: 0, introducedDay: "2026-10-12",
    };
    return s;
  };

  it("chưa học thẻ nào thì chưa xin", () => {
    expect(shouldAskPersist(emptyState(), notes(), NOW)).toBe(false);
    expect(shouldAskPersist(learning(), notes(), NOW)).toBe(true);
  });

  it("đã hỏi thì đợi 30 ngày mới hỏi lại (Firefox hỏi người dùng)", () => {
    expect(shouldAskPersist(learning(), notes({ persistAskedAt: NOW - 1 }), NOW)).toBe(false);
    expect(shouldAskPersist(learning(), notes({ persistAskedAt: NOW - PERSIST_ASK_EVERY_MS }), NOW)).toBe(true);
  });
});

describe("đọc khối ghi chép", () => {
  it("thiếu, hỏng hay sai kiểu đều thành rỗng, giữ được trường hợp lệ", () => {
    expect(parseDevice(null)).toEqual(emptyDevice());
    expect(parseDevice("{oops")).toEqual(emptyDevice());
    expect(parseDevice("[]")).toEqual(emptyDevice());
    expect(parseDevice(JSON.stringify({ lastBackupAt: 5, persistAskedAt: "x" }))).toEqual(notes({ lastBackupAt: 5 }));
  });
});

describe("kho ghi chép và navigator.storage", () => {
  let data: Map<string, string>;
  let persisted: boolean;
  let persistGrants: boolean;
  let persistCalls: number;

  async function fresh() {
    vi.resetModules();
    return import("./device");
  }

  beforeEach(() => {
    data = new Map();
    persisted = false;
    persistGrants = false;
    persistCalls = 0;
    const ls = {
      get length() { return data.size; },
      key: (i: number) => [...data.keys()][i] ?? null,
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    };
    vi.stubGlobal("window", { localStorage: ls, addEventListener: () => {} });
    vi.stubGlobal("navigator", {
      storage: {
        persisted: async () => persisted,
        persist: async () => { persistCalls++; persisted = persistGrants; return persistGrants; },
        estimate: async () => ({ usage: 2_600_000, quota: 1e9 }),
      },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("ghi lần sao lưu và xoá hẹn “để sau”", async () => {
    const d = await fresh();
    d.snoozeBackupReminder(100);
    expect(d.getDevice().backupSnoozeUntil).toBe(100 + SNOOZE_MS);
    d.markBackedUp(200);
    expect(JSON.parse(data.get(DEVICE_KEY)!)).toEqual(notes({ lastBackupAt: 200 }));
    expect((await fresh()).getDevice().lastBackupAt).toBe(200); // mở trang mới vẫn nhớ
  });

  it("tự xin lưu bền một lần, rồi im 30 ngày dù trình duyệt từ chối", async () => {
    const d = await fresh();
    const s = emptyState();
    s.cards.x = {
      itemType: "KANA_READING", itemId: "あ", state: "LEARNING", stability: 1, difficulty: 5, dueAt: 0,
      lastReviewedAt: 0, reps: 1, lapses: 0, learningStep: 0, introducedDay: null,
    };
    await d.ensurePersistence(s, NOW);
    await d.ensurePersistence(s, NOW + DAY_MS);
    expect(persistCalls).toBe(1);
    expect(d.getDevice().persistAskedAt).toBe(NOW);
  });

  it("đã được bảo vệ thì không xin, không ghi gì", async () => {
    persisted = true;
    const d = await fresh();
    const s = emptyState();
    s.cards.x = {
      itemType: "KANA_READING", itemId: "あ", state: "LEARNING", stability: 1, difficulty: 5, dueAt: 0,
      lastReviewedAt: 0, reps: 1, lapses: 0, learningStep: 0, introducedDay: null,
    };
    await d.ensurePersistence(s, NOW);
    expect(persistCalls).toBe(0);
    expect(data.has(DEVICE_KEY)).toBe(false);
  });

  it("trạng thái lưu trữ và dung lượng", async () => {
    persistGrants = true;
    const d = await fresh();
    expect(await d.readStorageStatus()).toEqual({ protection: "best-effort", usage: 2_600_000, quota: 1e9 });
    expect(await d.requestPersistence(NOW)).toBe("persisted");
    expect((await d.readStorageStatus()).protection).toBe("persisted");

    data.set("kd.progress.v1", "abcd");
    data.set("other.app", "x".repeat(1000)); // khoá không phải của Kana Dōjō không tính
    const kdChars = [...data].filter(([k]) => k.startsWith("kd.")).reduce((n, [k, v]) => n + k.length + v.length, 0);
    expect(d.localDataBytes()).toBe(kdChars * 2);
  });

  it("không có navigator.storage (HTTP thường, trình duyệt cũ)", async () => {
    vi.stubGlobal("navigator", {});
    const d = await fresh();
    expect(await d.readStorageStatus()).toEqual({ protection: "unsupported", usage: null, quota: null });
    expect(await d.requestPersistence()).toBe("unsupported");
  });
});
