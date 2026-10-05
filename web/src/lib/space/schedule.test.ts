import { describe, expect, it } from "vitest";
import { cardKey } from "../learning/cards";
import { emptyState, type ProgressState } from "../learning/state";
import { cardSchedule, deckSchedule } from "./schedule";

const NOW = Date.parse("2026-10-05T03:00:00Z");
const DAY = 86_400_000;

function withCard(type: "VOCAB_MEANING" | "VOCAB_READING", id: string, dueAt: number): ProgressState {
  const s = emptyState();
  s.cards[cardKey(type, `u:${id}`)] = {
    itemType: type, itemId: `u:${id}`, state: "REVIEW", stability: 3, difficulty: 5, dueAt, lastReviewedAt: dueAt - DAY,
    reps: 1, lapses: 0, learningStep: 0, introducedDay: "2026-10-01",
  };
  return s;
}

describe("tình trạng ôn của thẻ tự soạn", () => {
  it("chưa có lịch = mới; quá hạn = đến hạn (kèm số ngày trễ); chưa tới = ôn sau N ngày", () => {
    expect(cardSchedule(emptyState(), "c1", NOW)).toEqual({ kind: "new" });
    expect(cardSchedule(withCard("VOCAB_MEANING", "c1", NOW - 3 * DAY - 5), "c1", NOW)).toEqual({ kind: "due", overdueDays: 3 });
    expect(cardSchedule(withCard("VOCAB_MEANING", "c1", NOW + 2 * DAY - 5), "c1", NOW)).toEqual({ kind: "later", inDays: 2 });
    expect(cardSchedule(withCard("VOCAB_MEANING", "c1", NOW + 1000), "c1", NOW)).toEqual({ kind: "later", inDays: 1 });
  });

  it("thống kê bộ: bộ hai chiều đếm mỗi chiều một thẻ", () => {
    const cards = [{ id: "c1", front: "a", back: "b", hint: "" }, { id: "c2", front: "c", back: "d", hint: "" }];
    const s = withCard("VOCAB_MEANING", "c1", NOW - DAY);
    expect(deckSchedule(s, { cards, reverse: false }, NOW)).toEqual({ total: 2, fresh: 1, due: 1 });
    expect(deckSchedule(s, { cards, reverse: true }, NOW)).toEqual({ total: 4, fresh: 3, due: 1 });
  });
});
