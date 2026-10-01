import { charsOf, type Script } from "../kana";
import {
  DEFAULT_DESIRED_RETENTION, gradeFromScore, newCardState, review as fsrsReview, type FsrsState,
} from "../fsrs";
import type {
  CardState, Grade, GradeResult, ItemType, KanaProgress, ProgressSummary, ReviewQueue, ReviewQueueItem, WritingResult,
} from "../types";
import {
  XP_WRITING_FIRST_PASS, recordActivity, reviewDelta, reviewXp, writingDelta,
} from "./activity";
import { evaluateBadges } from "./badges";
import { ALL_TYPES, cardKey, findKana, findVocab, isKanaType, itemExists, itemIdsOf, parseCardKey } from "./cards";
import type { CardRecord, ProgressState } from "./state";
import { DAY_MS, dayKey, type Clock } from "./time";

/* Hàng đợi ôn tập, chấm thẻ và ghi nhận một lần luyện viết.
   Mỗi thao tác là một hàm thuần: nhận trạng thái cũ, trả `{ state, result }` mới — nên "tất cả hoặc không gì cả"
   đến miễn phí (nếu ném lỗi giữa chừng thì trạng thái cũ không bị đụng tới). */

export interface Outcome<T> { state: ProgressState; result: T }

/** Số thẻ mới tối đa mỗi ngày. */
export const NEW_CARDS_PER_DAY = 10;
/** Ngưỡng stability (ngày) để coi một thẻ là "đã thuộc chắc". */
export const MASTERY_STABILITY_DAYS = 21;
const MAX_QUEUE = 100;

// ------------------------------------------------------------------ hàng đợi

/** Số thẻ mới đã được đưa vào học trong ngày địa phương hiện tại. */
function introducedToday(state: ProgressState, clock: Clock): number {
  const today = dayKey(clock.now, clock.zone);
  let n = 0;
  for (const c of Object.values(state.cards)) if (c.introducedDay === today) n++;
  return n;
}

function toQueueItem(card: CardRecord | null, itemType: ItemType, itemId: string, clock: Clock): ReviewQueueItem {
  const kana = isKanaType(itemType) ? findKana(itemId) : undefined;
  const vocab = !isKanaType(itemType) ? findVocab(itemId) : undefined;
  return {
    cardKey: cardKey(itemType, itemId),
    itemType,
    itemId,
    state: card?.state ?? "NEW",
    dueAt: card?.dueAt ?? clock.now,
    reps: card?.reps ?? 0,
    lapses: card?.lapses ?? 0,
    character: kana?.c ?? null,
    romaji: kana?.r ?? null,
    readingVi: kana?.vn ?? null,
    word: vocab?.word ?? null,
    reading: vocab?.reading ?? null,
    meaningVi: vocab?.meaningVi ?? null,
  };
}

/**
 * Hàng đợi: thẻ đến hạn trước (trễ hạn nhất đứng đầu), sau đó bổ sung thẻ mới cho tới khi đủ `limit`,
 * nhưng không vượt quá hạn mức thẻ mới mỗi ngày.
 *
 * Thẻ mới được cấp "lười": chúng chưa tồn tại trong trạng thái cho đến lần chấm đầu tiên, nên một người mới
 * không phải mang theo hàng trăm thẻ NEW.
 */
export function buildQueue(
  state: ProgressState,
  opts: { limit?: number; types?: readonly ItemType[] },
  clock: Clock,
): ReviewQueue {
  const size = Math.min(Math.max(Math.trunc(opts.limit ?? 20) || 1, 1), MAX_QUEUE);
  const wanted = opts.types?.length ? ALL_TYPES.filter((t) => opts.types!.includes(t)) : ALL_TYPES;

  const due = Object.values(state.cards)
    .filter((c) => wanted.includes(c.itemType) && c.dueAt <= clock.now && itemExists(c.itemType, c.itemId))
    .sort((a, b) => a.dueAt - b.dueAt)
    .slice(0, size)
    .map((c) => toQueueItem(c, c.itemType, c.itemId, clock));

  const room = Math.min(size - due.length, Math.max(NEW_CARDS_PER_DAY - introducedToday(state, clock), 0));
  const fresh: ReviewQueueItem[] = [];
  for (const type of wanted) {
    if (fresh.length >= room) break;
    for (const id of itemIdsOf(type)) {
      if (fresh.length >= room) break;
      if (!state.cards[cardKey(type, id)]) fresh.push(toQueueItem(null, type, id, clock));
    }
  }

  return { content: [...due, ...fresh], dueCount: due.length, newCount: fresh.length };
}

// ------------------------------------------------------------------ chấm thẻ

function storedState(s: CardState): CardRecord["state"] {
  if (s === "NEW") throw new Error("FSRS không bao giờ trả về trạng thái NEW sau một lần chấm");
  return s;
}

/** Áp kết quả FSRS lên thẻ (tạo thẻ nếu chưa có). Dùng chung cho chấm thẻ và luyện viết để chỉ có
 *  một cài đặt lịch trình duy nhất. */
function applyFsrs(
  draft: ProgressState, itemType: ItemType, itemId: string, grade: Grade, clock: Clock,
): GradeResult {
  const key = cardKey(itemType, itemId);
  const existing = draft.cards[key];

  const cur: FsrsState = existing
    ? { stability: existing.stability, difficulty: existing.difficulty, state: existing.state,
        learningStep: existing.learningStep, reps: existing.reps, lapses: existing.lapses }
    : newCardState();
  // Thẻ chưa từng ôn coi như R = 1: không suy diễn từ dữ liệu không tồn tại.
  const elapsedDays = existing?.lastReviewedAt != null ? Math.max((clock.now - existing.lastReviewedAt) / DAY_MS, 0) : 0;

  const res = fsrsReview(cur, grade, elapsedDays, clock.now, DEFAULT_DESIRED_RETENTION);
  draft.cards[key] = {
    itemType, itemId,
    state: storedState(res.next.state),
    stability: res.next.stability,
    difficulty: res.next.difficulty,
    dueAt: res.dueAt,
    lastReviewedAt: clock.now,
    reps: res.next.reps,
    lapses: res.next.lapses,
    learningStep: res.next.learningStep,
    introducedDay: existing?.introducedDay ?? dayKey(clock.now, clock.zone),
  };

  return {
    cardKey: key, nextDueAt: res.dueAt, intervalDays: res.intervalDays,
    stability: res.next.stability, difficulty: res.next.difficulty, state: res.next.state, xpEarned: 0,
  };
}

/** Chấm một thẻ: cập nhật FSRS, cộng XP và xét huy hiệu. */
export function gradeCard(
  state: ProgressState, key: string, grade: Grade, durationMs: number, clock: Clock,
): Outcome<GradeResult & { newBadges: string[] }> {
  const parsed = parseCardKey(key);
  if (!parsed || !itemExists(parsed.itemType, parsed.itemId)) throw new Error("Không tìm thấy thẻ ôn tương ứng");

  const draft = structuredClone(state);
  const result = applyFsrs(draft, parsed.itemType, parsed.itemId, grade, clock);

  const outcome = recordActivity(draft, reviewDelta(reviewXp(grade), durationMs), clock);
  const newBadges = evaluateBadges(draft, "REVIEW_GRADED", clock);

  return { state: draft, result: { ...result, xpEarned: outcome.xpAwarded, newBadges } };
}

// ------------------------------------------------------------------ luyện viết

export interface WritingInput {
  character: string;
  avgScore: number;
  /** Mọi nét hỏng (ngược chiều, quá ngắn…). Chỉ cần biết có hay không: một nét hỏng là đủ để coi như quên. */
  strokeErrors: readonly unknown[];
  durationMs: number;
}

const RECENT_WINDOW = 10;

/** Ghi nhận một lần luyện viết: lưu điểm, suy ra grade, cập nhật lịch ôn FSRS, cộng XP/streak và xét huy hiệu. */
export function recordWriting(state: ProgressState, input: WritingInput, clock: Clock): Outcome<WritingResult> {
  if (!findKana(input.character)) throw new Error("Không tìm thấy ký tự kana cần luyện viết");

  const score = Math.min(Math.max(Math.round(input.avgScore) || 0, 0), 100);
  const grade = gradeFromScore(score, input.strokeErrors.length > 0);
  const passed = grade >= 3;

  const draft = structuredClone(state);
  const { writing } = draft;

  // Phải hỏi trước khi ghi lần này, nếu không chính nó sẽ tự làm mất phần thưởng "đạt lần đầu".
  const alreadyPassedBefore = writing.passed.includes(input.character);

  writing.best[input.character] = Math.max(writing.best[input.character] ?? 0, score);
  if (passed && !alreadyPassedBefore) writing.passed.push(input.character);
  writing.recent = [...writing.recent, score].slice(-RECENT_WINDOW);

  const card = applyFsrs(draft, "KANA_WRITING", input.character, grade, clock);

  // Đạt lần đầu một ký tự được thưởng đậm hơn hẳn một lượt ôn thường.
  const xp = passed && !alreadyPassedBefore ? XP_WRITING_FIRST_PASS : reviewXp(grade);
  const outcome = recordActivity(draft, writingDelta(xp, input.durationMs), clock);
  const newBadges = evaluateBadges(draft, "WRITING_ATTEMPT", clock);

  return {
    state: draft,
    result: { passed, avgScore: score, grade, xpEarned: outcome.xpAwarded, card: { ...card, xpEarned: outcome.xpAwarded }, newBadges },
  };
}

// ------------------------------------------------------------------ tiến độ

/** Một ô cho mỗi ký tự, kể cả ký tự chưa từng học (level 0). */
export function kanaProgress(state: ProgressState, script: Script): KanaProgress[] {
  return charsOf(script, "all").map((c) => {
    const card = state.cards[cardKey("KANA_WRITING", c.c)];
    return {
      character: c.c,
      state: card?.state ?? "NEW",
      dueAt: card?.dueAt ?? null,
      bestScore: state.writing.best[c.c] ?? 0,
      level: !card ? 0 : card.state === "REVIEW" ? 2 : 1,
    };
  });
}

export function summaryOf(state: ProgressState, clock: Clock): ProgressSummary {
  const cards = Object.values(state.cards);
  return {
    kanaLearned: cards.filter((c) => c.itemType === "KANA_WRITING").length,
    kanaMastered: cards.filter(
      (c) => c.itemType === "KANA_WRITING" && c.state === "REVIEW" && c.stability >= MASTERY_STABILITY_DAYS,
    ).length,
    dueToday: cards.filter((c) => c.dueAt <= clock.now && itemExists(c.itemType, c.itemId)).length,
  };
}
