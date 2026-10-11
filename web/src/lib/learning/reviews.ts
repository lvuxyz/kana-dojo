import { charsOf, type Script } from "../kana";
import { gradeFromScore, newCardState, review as fsrsReview, type FsrsState } from "../fsrs";
import type {
  CardState, Grade, GradeResult, ItemType, KanaProgress, ProgressSummary, ReviewQueue, ReviewQueueItem, WritingResult,
} from "../types";
import {
  XP_WRITING_FIRST_PASS, recordActivity, reviewDelta, reviewXp, writingDelta,
} from "./activity";
import { evaluateBadges } from "./badges";
import {
  ALL_TYPES, cardKey, findKana, findUserCard, findVocab, inStudy, isKanaType, itemExists, itemIdsOf, parseCardKey,
  userItemsOf,
} from "./cards";
import { DEFAULT_CONTEXT, NEW_CARDS_PER_DAY, userItemId, type LearnContext } from "./context";
import type { CardRecord, ProgressState } from "./state";
import { DAY_MS, dayKey, type Clock } from "./time";

/* Hàng đợi ôn tập, chấm thẻ và ghi nhận một lần luyện viết.
   Mỗi thao tác là một hàm thuần: nhận trạng thái cũ, trả `{ state, result }` mới — nên "tất cả hoặc không gì cả"
   đến miễn phí (nếu ném lỗi giữa chừng thì trạng thái cũ không bị đụng tới). */

export interface Outcome<T> { state: ProgressState; result: T }

export { NEW_CARDS_PER_DAY };
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

function toQueueItem(
  card: CardRecord | null, itemType: ItemType, itemId: string, clock: Clock, ctx: LearnContext,
): ReviewQueueItem {
  const kana = isKanaType(itemType) ? findKana(itemId) : undefined;
  const mine = findUserCard(itemId, ctx.catalog);
  const vocab = !isKanaType(itemType) && !mine ? findVocab(itemId) : undefined;
  // Thẻ tự soạn đi qua các trường của thẻ từ vựng, để trang Ôn tập không cần biết nguồn gốc của thẻ:
  // chiều xuôi hỏi `word` (mặt trước) đáp `meaningVi` (mặt sau); chiều ngược đổi chỗ hai mặt.
  const reverse = mine !== undefined && itemType === "VOCAB_READING";
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
    word: mine ? (reverse ? mine.back : mine.front) : (vocab?.word ?? null),
    reading: mine ? (reverse ? mine.front : mine.hint || null) : (vocab?.reading ?? null),
    meaningVi: mine ? (reverse ? mine.hint || null : mine.back) : (vocab?.meaningVi ?? null),
  };
}

/** Thẻ NEW còn chưa học của một nguồn, theo đúng thứ tự dạy: mỗi lần gọi `next()` trả thẻ kế tiếp hoặc null. */
function freshFrom(
  state: ProgressState, ids: Iterable<{ itemType: ItemType; itemId: string }>, accept: (t: ItemType, id: string) => boolean,
): () => { itemType: ItemType; itemId: string } | null {
  const it = ids[Symbol.iterator]();
  return () => {
    for (let n = it.next(); !n.done; n = it.next()) {
      const { itemType, itemId } = n.value;
      if (accept(itemType, itemId) && !state.cards[cardKey(itemType, itemId)]) return n.value;
    }
    return null;
  };
}

function* builtinItems(type: ItemType): Generator<{ itemType: ItemType; itemId: string }> {
  for (const itemId of itemIdsOf(type)) yield { itemType: type, itemId };
}

/**
 * Hàng đợi: thẻ đến hạn trước (trễ hạn nhất đứng đầu), sau đó bổ sung thẻ mới cho tới khi đủ `limit`,
 * nhưng không vượt quá hạn mức thẻ mới mỗi ngày.
 *
 * Thẻ mới được cấp "lười": chúng chưa tồn tại trong trạng thái cho đến lần chấm đầu tiên, nên một người mới
 * không phải mang theo hàng trăm thẻ NEW.
 *
 * Người học quyết định cách học qua `ctx.study` (hạn mức, nguồn thẻ nào bật, kana nào, thứ tự cấp thẻ mới) và
 * `ctx.catalog` (thẻ tự soạn). Không truyền `ctx` thì chạy với mặc định: toàn bộ nội dung đóng gói, 10 thẻ mới/ngày.
 */
export function buildQueue(
  state: ProgressState,
  opts: { limit?: number; types?: readonly ItemType[] },
  clock: Clock,
  ctx: LearnContext = DEFAULT_CONTEXT,
): ReviewQueue {
  const { catalog, study } = ctx;
  const size = Math.min(Math.max(Math.trunc(opts.limit ?? 20) || 1, 1), MAX_QUEUE);
  const wanted = opts.types?.length ? ALL_TYPES.filter((t) => opts.types!.includes(t)) : ALL_TYPES;
  const accept = (t: ItemType, id: string) => wanted.includes(t) && itemExists(t, id, catalog) && inStudy(t, id, study);

  const due = Object.values(state.cards)
    .filter((c) => c.dueAt <= clock.now && accept(c.itemType, c.itemId))
    .sort((a, b) => a.dueAt - b.dueAt)
    .slice(0, size)
    .map((c) => toQueueItem(c, c.itemType, c.itemId, clock, ctx));

  const room = Math.min(size - due.length, Math.max(study.newCardsPerDay - introducedToday(state, clock), 0));
  const fresh: ReviewQueueItem[] = [];
  if (room > 0) {
    const builtin = ALL_TYPES.map((t) => freshFrom(state, builtinItems(t), accept));
    const mine = freshFrom(state, userItemsOf(catalog), accept);
    // "mine": thẻ của người học trước · "builtin": nội dung đóng gói trước (cách cũ) · "mixed": xen kẽ từng nguồn
    const sources = study.newOrder === "builtin" ? [...builtin, mine] : [mine, ...builtin];
    const take = (next: typeof mine) => {
      const item = next();
      if (item) fresh.push(toQueueItem(null, item.itemType, item.itemId, clock, ctx));
      return item !== null;
    };
    if (study.newOrder === "mixed") {
      // Mỗi vòng lấy một thẻ từ mỗi nguồn còn thẻ, cho tới khi đủ hoặc cạn.
      let live = sources;
      while (fresh.length < room && live.length > 0) live = live.filter((src) => fresh.length < room && take(src));
    } else {
      for (const src of sources) while (fresh.length < room && take(src));
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
  draft: ProgressState, itemType: ItemType, itemId: string, grade: Grade, clock: Clock, retention: number,
): GradeResult {
  const key = cardKey(itemType, itemId);
  const existing = draft.cards[key];

  const cur: FsrsState = existing
    ? { stability: existing.stability, difficulty: existing.difficulty, state: existing.state,
        learningStep: existing.learningStep, reps: existing.reps, lapses: existing.lapses }
    : newCardState();
  // Thẻ chưa từng ôn coi như R = 1: không suy diễn từ dữ liệu không tồn tại.
  const elapsedDays = existing?.lastReviewedAt != null ? Math.max((clock.now - existing.lastReviewedAt) / DAY_MS, 0) : 0;

  const res = fsrsReview(cur, grade, elapsedDays, clock.now, retention);
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
  ctx: LearnContext = DEFAULT_CONTEXT,
): Outcome<GradeResult & { newBadges: string[] }> {
  const parsed = parseCardKey(key);
  if (!parsed || !itemExists(parsed.itemType, parsed.itemId, ctx.catalog)) throw new Error("Không tìm thấy thẻ ôn tương ứng");

  const draft = structuredClone(state);
  const result = applyFsrs(draft, parsed.itemType, parsed.itemId, grade, clock, ctx.study.desiredRetention);

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
export function recordWriting(
  state: ProgressState, input: WritingInput, clock: Clock, ctx: LearnContext = DEFAULT_CONTEXT,
): Outcome<WritingResult> {
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

  const card = applyFsrs(draft, "KANA_WRITING", input.character, grade, clock, ctx.study.desiredRetention);

  // Đạt lần đầu một ký tự được thưởng đậm hơn hẳn một lượt ôn thường.
  const xp = passed && !alreadyPassedBefore ? XP_WRITING_FIRST_PASS : reviewXp(grade);
  const outcome = recordActivity(draft, writingDelta(xp, input.durationMs), clock);
  const newBadges = evaluateBadges(draft, "WRITING_ATTEMPT", clock);

  return {
    state: draft,
    result: { passed, avgScore: score, grade, xpEarned: outcome.xpAwarded, card: { ...card, xpEarned: outcome.xpAwarded }, newBadges },
  };
}

/** Bỏ lịch ôn của các thẻ tự soạn đã bị xoá khỏi thư viện (cả hai chiều hỏi). Trả về số thẻ đã bỏ.
 *  Chỉ gọi khi thẻ bị XOÁ: bộ thẻ tắt vẫn giữ lịch ôn để bật lại là học tiếp. XP, streak và huy hiệu đã nhận không đổi. */
export function forgetUserCards(state: ProgressState, cardIds: readonly string[]): Outcome<number> {
  const items = new Set(cardIds.map(userItemId));
  const keys = Object.keys(state.cards).filter((k) => items.has(state.cards[k].itemId));
  if (keys.length === 0) return { state, result: 0 };
  const draft = structuredClone(state);
  for (const k of keys) delete draft.cards[k];
  return { state: draft, result: keys.length };
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

export function summaryOf(state: ProgressState, clock: Clock, ctx: LearnContext = DEFAULT_CONTEXT): ProgressSummary {
  const cards = Object.values(state.cards);
  return {
    kanaLearned: cards.filter((c) => c.itemType === "KANA_WRITING").length,
    kanaMastered: cards.filter(
      (c) => c.itemType === "KANA_WRITING" && c.state === "REVIEW" && c.stability >= MASTERY_STABILITY_DAYS,
    ).length,
    // Cùng điều kiện với hàng đợi: thẻ của nguồn đang tắt không được tính là "đến hạn hôm nay".
    dueToday: cards.filter(
      (c) => c.dueAt <= clock.now && itemExists(c.itemType, c.itemId, ctx.catalog) && inStudy(c.itemType, c.itemId, ctx.study),
    ).length,
  };
}
