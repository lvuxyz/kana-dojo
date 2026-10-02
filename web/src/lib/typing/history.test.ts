import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RECENT_LIMIT,
  WEAK_DECAY,
  WEAK_LIMIT,
  addSession,
  addWeak,
  emptyHistory,
  findBest,
  HISTORY_CORRUPT_KEY,
  HISTORY_KEY,
  clearHistory,
  loadHistory,
  parseHistory,
  parseHistoryStrict,
  saveHistory,
  weakList,
  type SessionRecord,
} from "./history";

const session = (over: Partial<SessionRecord> = {}): SessionRecord => ({
  method: "ROMAJI",
  content: "HIRAGANA",
  mode: "PASSAGE",
  score: 100,
  kpm: 120,
  accuracy: 0.95,
  durationMs: 60_000,
  at: "2026-09-30T08:00:00.000Z",
  ...over,
});

describe("addSession", () => {
  it("lượt đầu tiên của một tổ hợp luôn là kỷ lục", () => {
    const { history, personalBest, newBest } = addSession(emptyHistory(), session());
    expect(newBest).toBe(true);
    expect(personalBest).toBe(100);
    expect(history.totalSessions).toBe(1);
    expect(history.totalDurationMs).toBe(60_000);
    expect(history.bests).toHaveLength(1);
    expect(history.recent).toHaveLength(1);
  });

  it("kỷ lục chỉ đổi khi điểm cao hơn; KPM và độ chính xác tốt nhất tính riêng", () => {
    let h = addSession(emptyHistory(), session({ score: 200, kpm: 210, accuracy: 0.9 })).history;
    const worse = addSession(h, session({ score: 150, kpm: 160, accuracy: 0.99 }));
    expect(worse.newBest).toBe(false);
    expect(worse.personalBest).toBe(200);
    h = worse.history;
    const best = findBest(h, { method: "ROMAJI", content: "HIRAGANA", mode: "PASSAGE" })!;
    expect(best).toMatchObject({ bestScore: 200, bestKpm: 210, bestAccuracy: 0.99, plays: 2 });
  });

  it("tách kỷ lục theo tổ hợp, tổ hợp chơi gần nhất đứng đầu", () => {
    let h = addSession(emptyHistory(), session({ score: 300 })).history;
    const other = addSession(h, session({ mode: "TIME_ATTACK", score: 50 }));
    expect(other.newBest).toBe(true);
    h = other.history;
    expect(h.bests.map((b) => b.mode)).toEqual(["TIME_ATTACK", "PASSAGE"]);
    h = addSession(h, session({ score: 10 })).history;
    expect(h.bests.map((b) => b.mode)).toEqual(["PASSAGE", "TIME_ATTACK"]);
  });

  it("không sửa lịch sử cũ và chỉ giữ số lượt gần nhất có giới hạn", () => {
    const start = emptyHistory();
    addSession(start, session());
    expect(start.totalSessions).toBe(0);

    let h = start;
    for (let i = 0; i < RECENT_LIMIT + 5; i++) h = addSession(h, session({ score: i })).history;
    expect(h.recent).toHaveLength(RECENT_LIMIT);
    expect(h.recent[0].score).toBe(RECENT_LIMIT + 4);
    expect(h.totalSessions).toBe(RECENT_LIMIT + 5);
  });
});

describe("parseHistory", () => {
  it("dữ liệu trống, hỏng hoặc sai hình dạng thì bắt đầu lại", () => {
    expect(parseHistory(null)).toEqual(emptyHistory());
    expect(parseHistory("{not json")).toEqual(emptyHistory());
    expect(parseHistory(JSON.stringify({ bests: "x" }))).toEqual(emptyHistory());
  });

  it("đọc lại đúng thứ đã ghi", () => {
    const h = addSession(emptyHistory(), session()).history;
    expect(parseHistory(JSON.stringify(h))).toEqual(h);
  });
});

describe("addWeak — chữ hay sai", () => {
  it("cộng dồn lần sai, chữ cũ giảm dần theo từng lượt", () => {
    let h = addWeak(emptyHistory(), [["ぢ", 3], ["しゃ", 1]]);
    expect(weakList(h)).toEqual([["ぢ", 3], ["しゃ", 1]]);
    h = addWeak(h, [["しゃ", 2]]);
    expect(h.weakKana["ぢ"]).toBeCloseTo(3 * WEAK_DECAY);
    expect(h.weakKana["しゃ"]).toBeCloseTo(1 * WEAK_DECAY + 2);
  });

  it("chữ không sai lại thì tự rơi khỏi danh sách", () => {
    let h = addWeak(emptyHistory(), [["ぬ", 1]]);
    for (let i = 0; i < 5; i++) h = addWeak(h, []);
    expect(h.weakKana).toEqual({});
  });

  it("bỏ kanji và ký tự không gõ được, giữ tối đa WEAK_LIMIT chữ", () => {
    expect(addWeak(emptyHistory(), [["駅", 2], ["", 1]]).weakKana).toEqual({});
    const many = Array.from({ length: WEAK_LIMIT + 10 }, (_, i) => [String.fromCharCode(0x3042 + (i % 80)), 1 + i] as [string, number]);
    expect(Object.keys(addWeak(emptyHistory(), many).weakKana).length).toBeLessThanOrEqual(WEAK_LIMIT);
  });

  it("ghi thêm lượt không làm mất danh sách chữ yếu; bản lưu cũ không có danh sách thì bắt đầu rỗng", () => {
    const h = addWeak(emptyHistory(), [["ぢ", 2]]);
    expect(addSession(h, session()).history.weakKana).toEqual({ ぢ: 2 });
    const legacy = { totalSessions: 1, totalDurationMs: 1, bests: [], recent: [] };
    expect(parseHistory(JSON.stringify(legacy)).weakKana).toEqual({});
  });
});

/** localStorage giả — chạy trong Node, không cần jsdom (cùng kiểu với store.test.ts). */
class FakeStorage {
  data = new Map<string, string>();
  failWrites = false;
  blocked = false;
  getItem = (k: string) => {
    if (this.blocked) throw new DOMException("blocked", "SecurityError");
    return this.data.get(k) ?? null;
  };
  setItem = (k: string, v: string) => {
    if (this.blocked || this.failWrites) throw new DOMException("quota", "QuotaExceededError");
    this.data.set(k, v);
  };
  removeItem = (k: string) => {
    if (this.blocked) throw new DOMException("blocked", "SecurityError");
    this.data.delete(k);
  };
}

describe("lưu trên localStorage", () => {
  let ls: FakeStorage;
  beforeEach(() => {
    ls = new FakeStorage();
    vi.stubGlobal("window", { localStorage: ls });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("khoá cố định, cùng tiền tố `kd.` với tiến độ chính và không còn hậu tố tài khoản", () => {
    expect(HISTORY_KEY).toBe("kd.typing.history.v1");
    expect(HISTORY_CORRUPT_KEY).toBe("kd.typing.history.corrupt");
  });

  it("chưa có gì thì rỗng; ghi rồi đọc lại đúng thứ đã ghi", () => {
    expect(loadHistory()).toEqual(emptyHistory());
    const h = addSession(emptyHistory(), session()).history;
    saveHistory(h);
    expect(loadHistory()).toEqual(h);
    expect(ls.data.has(HISTORY_KEY)).toBe(true);
  });

  it("dữ liệu hỏng được giữ lại để cứu hộ, không bị ghi đè âm thầm", () => {
    ls.data.set(HISTORY_KEY, "{not json");
    expect(loadHistory()).toEqual(emptyHistory());
    expect(ls.data.get(HISTORY_CORRUPT_KEY)).toBe("{not json");
    expect(parseHistoryStrict("{not json")).toBeNull();
    expect(parseHistoryStrict(JSON.stringify({ bests: "x" }))).toBeNull();
    expect(parseHistoryStrict("null")).toBeNull();
  });

  it("xoá kỷ lục xoá cả bản sao hỏng", () => {
    ls.data.set(HISTORY_KEY, "{not json");
    loadHistory();
    clearHistory();
    expect(ls.data.size).toBe(0);
  });

  it("trình duyệt chặn hoặc đầy bộ nhớ thì không ném lỗi, vẫn chơi được", () => {
    ls.failWrites = true;
    expect(() => saveHistory(emptyHistory())).not.toThrow();
    ls.blocked = true;
    expect(loadHistory()).toEqual(emptyHistory());
    expect(() => saveHistory(emptyHistory())).not.toThrow();
    expect(() => clearHistory()).not.toThrow();
  });
});
