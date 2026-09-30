import { describe, expect, it } from "vitest";
import { RECENT_LIMIT, addSession, emptyHistory, findBest, parseHistory, type SessionRecord } from "./history";

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
