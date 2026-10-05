import { cardKey } from "../learning/cards";
import { userItemId } from "../learning/context";
import type { ProgressState } from "../learning/state";
import type { Deck } from "./space";

/* Tình trạng ôn của thẻ tự soạn, đọc từ tiến độ — để trang bộ thẻ cho người học thấy thẻ nào mới, thẻ nào đến hạn. */

export type CardSchedule =
  | { kind: "new" }
  | { kind: "due"; overdueDays: number }
  | { kind: "later"; inDays: number };

const DAY = 86_400_000;

/** Chiều xuôi (mặt trước → mặt sau) của một thẻ. */
export function cardSchedule(state: ProgressState, cardId: string, now: number): CardSchedule {
  const rec = state.cards[cardKey("VOCAB_MEANING", userItemId(cardId))];
  if (!rec) return { kind: "new" };
  if (rec.dueAt <= now) return { kind: "due", overdueDays: Math.floor((now - rec.dueAt) / DAY) };
  return { kind: "later", inDays: Math.max(1, Math.ceil((rec.dueAt - now) / DAY)) };
}

export interface DeckSchedule {
  /** Số thẻ ôn thật sự của bộ (mỗi chiều tính một thẻ). */
  total: number;
  /** Chưa học lần nào. */
  fresh: number;
  /** Đã học và đang đến hạn. */
  due: number;
}

export function deckSchedule(state: ProgressState, deck: Pick<Deck, "cards" | "reverse">, now: number): DeckSchedule {
  let total = 0;
  let fresh = 0;
  let due = 0;
  for (const c of deck.cards) {
    const types = deck.reverse ? (["VOCAB_MEANING", "VOCAB_READING"] as const) : (["VOCAB_MEANING"] as const);
    for (const t of types) {
      total++;
      const rec = state.cards[cardKey(t, userItemId(c.id))];
      if (!rec) fresh++;
      else if (rec.dueAt <= now) due++;
    }
  }
  return { total, fresh, due };
}
