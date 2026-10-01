/* Hàng đợi ôn, chấm thẻ, ghi bài viết và tiến độ — bản port của ReviewService, WritingService và ProgressService.
   Mọi hàm nhận `state` đã nạp và SỬA TRỰC TIẾP nó; chỗ gọi (router.ts) bọc trong `mutate()` nên một thao tác
   hoặc được ghi trọn vẹn, hoặc (nếu ném lỗi giữa chừng) không ghi gì — giống giao dịch một lần của backend. */

import { badRequest, notFound } from "../api-error";
import type {
  CardState, GradeResultDto, ItemType, KanaProgressDto, ProgressSummaryDto, ReviewQueueDto, ReviewQueueItemDto,
  WritingResultDto,
} from "../types";
import { KANA_LIST, VOCAB_LIST, kanaById, vocabById } from "./catalog";
import { DEFAULT_DESIRED_RETENTION, gradeFromScore, review, type FsrsState } from "./fsrs";
import {
  NEW_CARDS_PER_DAY, XP_WRITING_FIRST_PASS, activity, evaluateBadges, recordActivity, reviewXp, todayOf,
} from "./gamification";
import type { LocalCard, LocalState } from "./store";

const ITEM_ORDER: ItemType[] = ["KANA_WRITING", "KANA_READING", "VOCAB_MEANING", "VOCAB_READING"];
const KANA_TYPES = new Set<ItemType>(["KANA_WRITING", "KANA_READING"]);
const VOCAB_TYPES = new Set<ItemType>(["VOCAB_MEANING", "VOCAB_READING"]);
/** Ngưỡng stability (ngày) để coi một thẻ là "đã thuộc chắc". */
const MASTERY_STABILITY_DAYS = 21;

const cardKey = (type: ItemType, itemId: number) => `${type}:${itemId}`;
const cards = (state: LocalState) => Object.values(state.cards);
const dueTime = (c: LocalCard) => new Date(c.dueAt).getTime();

// ---------------------------------------------------------------------------
// Thẻ + FSRS
// ---------------------------------------------------------------------------

function createCard(state: LocalState, type: ItemType, itemId: number, now: Date): LocalCard {
  const card: LocalCard = {
    id: state.nextCardId++, type, itemId, state: "NEW", stability: 0, difficulty: 0,
    dueAt: now.toISOString(), lastReviewedAt: null, reps: 0, lapses: 0, learningStep: 0, introducedOn: null,
  };
  state.cards[cardKey(type, itemId)] = card;
  return card;
}

/** Lấy thẻ của một mục nội dung, tạo mới nếu người học chưa từng chạm tới. */
export function findOrCreateCard(state: LocalState, type: ItemType, itemId: number, now: Date): LocalCard {
  return state.cards[cardKey(type, itemId)] ?? createCard(state, type, itemId, now);
}

const toFsrs = (c: LocalCard): FsrsState => ({
  stability: c.stability, difficulty: c.difficulty, state: c.state, learningStep: c.learningStep, reps: c.reps, lapses: c.lapses,
});

/** Số ngày THỰC TẾ kể từ lần ôn trước; thẻ chưa từng ôn trả 0. */
function elapsedDaysAt(c: LocalCard, now: Date): number {
  if (!c.lastReviewedAt) return 0;
  return Math.max((now.getTime() - new Date(c.lastReviewedAt).getTime()) / 86_400_000, 0);
}

/** Áp kết quả FSRS lên thẻ (dùng chung cho chấm thẻ và ghi bài viết, tránh hai nhánh lịch trình lệch nhau). */
function applyGrade(state: LocalState, card: LocalCard, grade: number, now: Date) {
  const result = review(toFsrs(card), grade, elapsedDaysAt(card, now), now, DEFAULT_DESIRED_RETENTION);
  // Lần chấm đầu tiên = thẻ được "giới thiệu" trong ngày; đếm tường minh thay vì suy từ reps.
  if (card.reps === 0) card.introducedOn = todayOf(state, now);
  card.stability = result.next.stability;
  card.difficulty = result.next.difficulty;
  card.state = result.next.state;
  card.learningStep = result.next.learningStep;
  card.reps = result.next.reps;
  card.lapses = result.next.lapses;
  card.dueAt = result.dueAt.toISOString();
  card.lastReviewedAt = now.toISOString();
  return result;
}

function gradeResult(card: LocalCard, intervalDays: number, xpEarned: number): GradeResultDto {
  return {
    cardId: card.id, nextDueAt: card.dueAt, intervalDays,
    stability: card.stability, difficulty: card.difficulty, state: card.state, xpEarned,
  };
}

// ---------------------------------------------------------------------------
// Hàng đợi
// ---------------------------------------------------------------------------

function remainingNewCardQuota(state: LocalState, now: Date): number {
  const today = todayOf(state, now);
  const introduced = cards(state).filter((c) => c.introducedOn === today).length;
  return Math.max(NEW_CARDS_PER_DAY - introduced, 0);
}

function nextItemIds(state: LocalState, type: ItemType, count: number): number[] {
  if (KANA_TYPES.has(type)) {
    return KANA_LIST.filter((k) => !state.cards[cardKey(type, k.id)]).slice(0, count).map((k) => k.id);
  }
  if (VOCAB_TYPES.has(type)) {
    return VOCAB_LIST.filter((v) => !state.cards[cardKey(type, v.id)]).slice(0, count).map((v) => v.id);
  }
  return [];
}

/** Tạo thêm thẻ NEW (lười) cho tới khi có đủ `needed` thẻ chờ trong các loại được yêu cầu. */
function materializeNewCards(state: LocalState, types: Set<ItemType>, needed: number, now: Date) {
  let missing = needed - cards(state).filter((c) => c.state === "NEW" && types.has(c.type)).length;
  for (const type of ITEM_ORDER) {
    if (missing <= 0) break;
    if (!types.has(type)) continue;
    for (const id of nextItemIds(state, type, missing)) {
      createCard(state, type, id, now);
      missing--;
    }
  }
}

function toQueueItem(c: LocalCard): ReviewQueueItemDto {
  const kana = KANA_TYPES.has(c.type) ? kanaById(c.itemId) : undefined;
  const word = VOCAB_TYPES.has(c.type) ? vocabById(c.itemId) : undefined;
  return {
    cardId: c.id, itemType: c.type, itemId: c.itemId, state: c.state, dueAt: c.dueAt, reps: c.reps, lapses: c.lapses,
    character: kana?.c ?? null, romaji: kana?.r ?? null, readingVi: kana?.vn ?? null,
    word: word?.word ?? null, reading: word?.reading ?? null, meaningVi: word?.meaningVi ?? null,
  };
}

/** Thẻ đến hạn trước (trễ nhất lên đầu), sau đó bổ sung thẻ mới trong hạn mức thẻ mới mỗi ngày. */
export function queue(state: LocalState, limit: number, requestedTypes: ItemType[] | null, now: Date): ReviewQueueDto {
  const size = Math.min(Math.max(Math.trunc(limit) || 20, 1), 100);
  const types = new Set<ItemType>(requestedTypes && requestedTypes.length > 0 ? requestedTypes : ITEM_ORDER);

  const due = cards(state)
    .filter((c) => c.state !== "NEW" && types.has(c.type) && dueTime(c) <= now.getTime())
    .sort((a, b) => dueTime(a) - dueTime(b))
    .slice(0, size);

  let fresh: LocalCard[] = [];
  const remaining = size - due.length;
  if (remaining > 0) {
    const n = Math.min(remaining, remainingNewCardQuota(state, now));
    if (n > 0) {
      materializeNewCards(state, types, n, now);
      fresh = cards(state)
        .filter((c) => c.state === "NEW" && types.has(c.type))
        .sort((a, b) => a.itemId - b.itemId || ITEM_ORDER.indexOf(a.type) - ITEM_ORDER.indexOf(b.type))
        .slice(0, n);
    }
  }
  return { content: [...due, ...fresh].map(toQueueItem), dueCount: due.length, newCount: fresh.length };
}

export interface GradeInput { cardId?: number; grade?: number; score?: number | null; durationMs?: number | null }

/** Chấm một thẻ: cập nhật FSRS, cộng XP và xét huy hiệu. */
export function gradeCard(state: LocalState, input: GradeInput, now: Date): GradeResultDto {
  if (typeof input.cardId !== "number") throw badRequest("Thiếu cardId", { cardId: "Thiếu cardId" });
  if (!Number.isInteger(input.grade) || input.grade! < 1 || input.grade! > 4) {
    throw badRequest("grade phải từ 1 đến 4", { grade: "grade phải từ 1 đến 4" });
  }
  if (input.score != null && (input.score < 0 || input.score > 100)) throw badRequest("Điểm phải từ 0 đến 100");
  if (input.durationMs != null && input.durationMs < 0) throw badRequest("durationMs không được âm");

  const card = cards(state).find((c) => c.id === input.cardId);
  if (!card) throw notFound("Không tìm thấy thẻ ôn tương ứng");

  const result = applyGrade(state, card, input.grade!, now);
  const outcome = recordActivity(state, activity.review(reviewXp(input.grade!), input.durationMs), now);
  evaluateBadges(state, "REVIEW_GRADED", now);
  return gradeResult(card, result.intervalDays, outcome.xpAwarded);
}

// ---------------------------------------------------------------------------
// Ghi bài viết
// ---------------------------------------------------------------------------

export interface WritingInput {
  kanaCharacterId?: number;
  mode?: string;
  strokeScores?: number[];
  strokeErrors?: { index: number; reason: string }[] | null;
  avgScore?: number;
  durationMs?: number | null;
}

const inRange = (v: unknown) => typeof v === "number" && v >= 0 && v <= 100;

/** Ghi một lần luyện viết: lưu bài → đo grade → cập nhật thẻ FSRS → cộng XP/streak → xét huy hiệu. */
export function recordWriting(state: LocalState, input: WritingInput, now: Date): WritingResultDto {
  if (typeof input.kanaCharacterId !== "number") throw badRequest("Thiếu kanaCharacterId");
  if (input.mode !== "TRACE" && input.mode !== "TEST") throw badRequest("Thiếu chế độ luyện viết");
  if (!Array.isArray(input.strokeScores) || input.strokeScores.length < 1 || input.strokeScores.length > 64
    || !input.strokeScores.every(inRange)) {
    throw badRequest("Điểm từng nét không hợp lệ (1–64 nét, mỗi nét 0–100)");
  }
  if (!inRange(input.avgScore)) throw badRequest("Điểm trung bình phải từ 0 đến 100");
  if (input.durationMs != null && input.durationMs < 0) throw badRequest("durationMs không được âm");

  const kana = kanaById(input.kanaCharacterId);
  if (!kana) throw notFound("Không tìm thấy ký tự kana cần luyện viết");

  const avgScore = Math.round(input.avgScore!);
  const anyStrokeFailed = (input.strokeErrors ?? []).length > 0;
  const grade = gradeFromScore(avgScore, anyStrokeFailed);
  const passed = grade >= 3;

  // Phải hỏi trước khi ghi lần này, nếu không chính nó tự làm mất phần thưởng "đạt lần đầu".
  const key = String(kana.id);
  const alreadyPassedBefore = !!state.writing.passed[key];

  // (1) Điểm cao nhất, các lượt gần nhất (cho huy hiệu "mười điểm tuyệt đối").
  state.writing.best[key] = Math.max(state.writing.best[key] ?? 0, avgScore);
  if (passed) state.writing.passed[key] = true;
  state.writing.recent = [avgScore, ...state.writing.recent].slice(0, 10);

  // (2)(3) Grade đã đo được ở trên; áp thẳng vào lịch ôn của thẻ viết tương ứng.
  const card = findOrCreateCard(state, "KANA_WRITING", kana.id, now);
  const result = applyGrade(state, card, grade, now);

  // (5) Đạt lần đầu một ký tự được thưởng đậm hơn hẳn một lượt ôn thường.
  const xp = passed && !alreadyPassedBefore ? XP_WRITING_FIRST_PASS : reviewXp(grade);
  const outcome = recordActivity(state, activity.writing(xp, input.durationMs), now);
  const newBadges = evaluateBadges(state, "WRITING_ATTEMPT", now);

  return { passed, avgScore, grade, xpEarned: outcome.xpAwarded, card: gradeResult(card, result.intervalDays, outcome.xpAwarded), newBadges };
}

// ---------------------------------------------------------------------------
// Tiến độ
// ---------------------------------------------------------------------------

/** Quy trạng thái SRS thành thang 0..5. Dùng stability thay vì số lần ôn: cùng 5 lần ôn có thể nhớ rất khác nhau. */
function masteryLevel(card: LocalCard | undefined): number {
  if (!card || card.state === "NEW") return 0;
  if (card.state === "LEARNING" || card.state === "RELEARNING") return 1;
  if (card.stability < 7) return 2;
  if (card.stability < MASTERY_STABILITY_DAYS) return 3;
  if (card.stability < 60) return 4;
  return 5;
}

/** Một ô cho mỗi ký tự, kể cả ký tự chưa từng học (level 0). */
export function kanaProgress(state: LocalState, script: "h" | "k" | null): KanaProgressDto[] {
  return KANA_LIST.filter((k) => script === null || k.s === script).map((k) => {
    const card = state.cards[cardKey("KANA_WRITING", k.id)];
    return {
      characterId: k.id,
      character: k.c,
      state: (card?.state ?? "NEW") as CardState,
      dueAt: card ? card.dueAt : null,
      // 0 = chưa từng viết; giao diện chỉ vẽ thanh điểm khi level > 0.
      bestScore: state.writing.best[String(k.id)] ?? 0,
      // Giữ nguyên thang 0–5 của backend (ProgressService.masteryLevel); kiểu 0|1|2 trong types.ts là chỗ lệch đã biết
      // (docs/STATUS.md, lỗi C) — chưa sửa ở đây để hai chế độ trả cùng một hợp đồng.
      level: masteryLevel(card) as KanaProgressDto["level"],
    };
  });
}

export function progressSummary(state: LocalState, now: Date): ProgressSummaryDto {
  const all = cards(state);
  const started = (types: Set<ItemType>) => all.filter((c) => types.has(c.type) && c.state !== "NEW").length;
  return {
    kanaLearned: started(new Set<ItemType>(["KANA_WRITING"])),
    kanaMastered: all.filter((c) => c.type === "KANA_WRITING" && c.state === "REVIEW" && c.stability >= MASTERY_STABILITY_DAYS).length,
    vocabLearned: started(VOCAB_TYPES),
    dueToday: all.filter((c) => c.state !== "NEW" && dueTime(c) <= now.getTime()).length,
    newAvailable: Math.min(all.filter((c) => c.state === "NEW").length, NEW_CARDS_PER_DAY),
  };
}
