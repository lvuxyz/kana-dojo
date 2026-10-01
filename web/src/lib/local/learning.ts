/** Hàng đợi ôn, chấm thẻ, ghi nhận bài viết, tiến độ và tra từ vựng — port của ReviewService, WritingService,
 *  ProgressService và VocabularyService. Thẻ được tạo lười: chỉ vật chất hoá số thẻ mới được phép nhận trong ngày. */
import type {
  CardState, GradeResultDto, ItemType, KanaCharacterDto, KanaProgressDto, Page, PracticeMode,
  ProgressSummaryDto, ReviewQueueDto, ReviewQueueItemDto, VocabularyDto, WritingResultDto,
} from "../types";
import { kanaById, KANA_CATALOG, vocabById, VOCABULARY } from "./content";
import { nowMs, type Db, type LocalCard, type LocalUser } from "./db";
import { notFound, validation } from "./errors";
import { DEFAULT_DESIRED_RETENTION, gradeFromScore, review, type FsrsState } from "./fsrs";
import {
  dataFor, ensureWithinQuota, evaluateBadges, FEATURE_DAILY_REVIEWS, FEATURE_DAILY_WRITING, minJlptLevel,
  NEW_CARDS_PER_DAY, recordActivity, reviewDelta, reviewXp, todayOf, writingDelta, XP_WRITING_FIRST_PASS,
} from "./gamification";
import { localDate } from "./time";

/** Thứ tự khai báo của enum ItemType ở backend — quyết định thứ tự cấp thẻ mới. */
export const ITEM_TYPES: readonly ItemType[] = ["KANA_WRITING", "KANA_READING", "VOCAB_MEANING", "VOCAB_READING"];
const isKana = (t: ItemType) => t === "KANA_WRITING" || t === "KANA_READING";

/** Ngưỡng stability (ngày) để coi một thẻ là "đã thuộc chắc". */
const MASTERY_STABILITY_DAYS = 21;

const iso = (ms: number) => new Date(ms).toISOString();

// ------------------------------------------------------------------- thẻ ôn

function newCard(db: Db, itemType: ItemType, itemId: number, now: number): LocalCard {
  return {
    id: ++db.seq.card, itemType, itemId, state: "NEW", stability: 0, difficulty: 0,
    dueAt: iso(now), lastReviewedAt: null, reps: 0, lapses: 0, learningStep: 0,
  };
}

const elapsedDaysAt = (card: LocalCard, now: number) =>
  card.lastReviewedAt === null ? 0 : Math.max((now - Date.parse(card.lastReviewedAt)) / 86_400_000, 0);

/** Áp kết quả FSRS lên thẻ — dùng chung cho chấm thẻ và bài viết, để chỉ có một cài đặt lịch trình. */
function applyFsrs(card: LocalCard, grade: number, now: number) {
  const cur: FsrsState = {
    stability: card.stability, difficulty: card.difficulty, state: card.state,
    learningStep: card.learningStep, reps: card.reps, lapses: card.lapses,
  };
  const result = review(cur, grade, elapsedDaysAt(card, now), new Date(now), DEFAULT_DESIRED_RETENTION);
  card.stability = result.next.stability;
  card.difficulty = result.next.difficulty;
  card.state = result.next.state;
  card.learningStep = result.next.learningStep;
  card.reps = result.next.reps;
  card.lapses = result.next.lapses;
  card.dueAt = result.dueAt.toISOString();
  card.lastReviewedAt = iso(now);
  return result;
}

function gradeResult(card: LocalCard, intervalDays: number, xpEarned: number): GradeResultDto {
  return {
    cardId: card.id, nextDueAt: card.dueAt, intervalDays,
    stability: card.stability, difficulty: card.difficulty, state: card.state, xpEarned,
  };
}

/** Số thẻ mới còn được nhận trong ngày địa phương hiện tại. */
function remainingNewCardQuota(cards: LocalCard[], user: LocalUser): number {
  const today = todayOf(user);
  const introduced = cards.filter((c) => c.state !== "NEW" && c.reps === 1
    && c.lastReviewedAt !== null && localDate(user.timezone, Date.parse(c.lastReviewedAt)) === today).length;
  return Math.max(NEW_CARDS_PER_DAY - introduced, 0);
}

function nextItemIds(cards: LocalCard[], user: LocalUser, type: ItemType, count: number): number[] {
  if (count <= 0) return [];
  const has = new Set(cards.filter((c) => c.itemType === type).map((c) => c.itemId));
  if (isKana(type)) {
    return KANA_CATALOG.filter((k) => !has.has(k.id)).slice(0, count).map((k) => k.id);
  }
  const minLevel = minJlptLevel(user);
  return VOCABULARY
    .filter((v) => !has.has(v.id) && !(v.jlptLevel !== null && v.jlptLevel < minLevel))
    .slice(0, count).map((v) => v.id);
}

/** Tạo thêm thẻ NEW cho tới khi có đủ `needed` thẻ chờ (idempotent: chỉ lấp phần thiếu). */
function materializeNewCards(db: Db, cards: LocalCard[], user: LocalUser, types: Set<ItemType>, needed: number, now: number) {
  const available = cards.filter((c) => c.state === "NEW").length;
  const missing = needed - available;
  if (missing <= 0) return;

  const toCreate: LocalCard[] = [];
  for (const type of ITEM_TYPES) {
    if (!types.has(type)) continue;
    if (toCreate.length >= missing) break;
    for (const id of nextItemIds(cards, user, type, missing - toCreate.length)) {
      toCreate.push(newCard(db, type, id, now));
    }
  }
  cards.push(...toCreate);
}

function toQueueItem(card: LocalCard): ReviewQueueItemDto {
  const kana = isKana(card.itemType) ? kanaById(card.itemId) : undefined;
  const word = !isKana(card.itemType) ? vocabById(card.itemId) : undefined;
  return {
    cardId: card.id, itemType: card.itemType, itemId: card.itemId, state: card.state, dueAt: card.dueAt,
    reps: card.reps, lapses: card.lapses,
    character: kana?.character ?? null, romaji: kana?.romaji ?? null, readingVi: kana?.readingVi ?? null,
    word: word?.word ?? null, reading: word?.reading ?? null, meaningVi: word?.meaningVi ?? null,
  };
}

/** Hàng đợi: thẻ đến hạn trước (cũ nhất lên đầu), rồi bổ sung thẻ mới theo hạn mức mỗi ngày. */
export function reviewQueue(db: Db, user: LocalUser, limit: number, requested: ItemType[] | null): ReviewQueueDto {
  const size = Math.min(Math.max(limit, 1), 100);
  const types = new Set<ItemType>(requested && requested.length ? requested : ITEM_TYPES);
  const now = nowMs();
  const cards = dataFor(db, user).cards;

  const due = cards
    .filter((c) => c.state !== "NEW" && Date.parse(c.dueAt) <= now && types.has(c.itemType))
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt))
    .slice(0, size);

  let fresh: LocalCard[] = [];
  const remaining = size - due.length;
  if (remaining > 0) {
    const quota = remainingNewCardQuota(cards, user);
    if (quota > 0) {
      const take = Math.min(remaining, quota);
      materializeNewCards(db, cards, user, types, take, now);
      fresh = cards
        .filter((c) => c.state === "NEW" && types.has(c.itemType))
        .sort((a, b) => a.itemId - b.itemId)
        .slice(0, take);
    }
  }
  return { content: [...due, ...fresh].map(toQueueItem), dueCount: due.length, newCount: fresh.length };
}

export interface GradeRequest { cardId?: number; grade?: number; score?: number | null; durationMs?: number | null }

/** Chấm một thẻ: cập nhật FSRS, cộng XP và xét huy hiệu. */
export function gradeCard(db: Db, user: LocalUser, req: GradeRequest): GradeResultDto {
  const errors: Record<string, string> = {};
  if (req.cardId == null) errors.cardId = "Thiếu cardId";
  if (req.grade == null) errors.grade = "Thiếu grade";
  else if (!Number.isInteger(req.grade) || req.grade < 1 || req.grade > 4) errors.grade = "grade phải từ 1 đến 4";
  if (req.score != null && (req.score < 0 || req.score > 100)) errors.score = "Điểm phải từ 0 đến 100";
  if (req.durationMs != null && req.durationMs < 0) errors.durationMs = "durationMs không được âm";
  if (Object.keys(errors).length) throw validation(errors);

  ensureWithinQuota(db, user, FEATURE_DAILY_REVIEWS);
  const card = dataFor(db, user).cards.find((c) => c.id === req.cardId);
  if (!card) throw notFound("Không tìm thấy thẻ ôn tương ứng");

  const result = applyFsrs(card, req.grade!, nowMs());
  const outcome = recordActivity(db, user, reviewDelta(reviewXp(req.grade!), req.durationMs ?? 0));
  evaluateBadges(db, user, "REVIEW_GRADED");
  return gradeResult(card, result.intervalDays, outcome.xpAwarded);
}

export interface WritingAttemptRequest {
  kanaCharacterId?: number; mode?: PracticeMode; strokeScores?: number[];
  strokeErrors?: { index: number; reason: string }[]; avgScore?: number; durationMs?: number | null;
}

/** Ghi nhận một lần luyện viết: lưu bài, suy grade, cập nhật FSRS, cộng XP/streak, xét huy hiệu — một giao dịch. */
export function recordWriting(db: Db, user: LocalUser, req: WritingAttemptRequest): WritingResultDto {
  const errors: Record<string, string> = {};
  if (req.kanaCharacterId == null) errors.kanaCharacterId = "Thiếu kanaCharacterId";
  if (req.mode !== "TRACE" && req.mode !== "TEST") errors.mode = "Thiếu chế độ luyện viết";
  const scores = req.strokeScores;
  if (!scores) errors.strokeScores = "Thiếu điểm từng nét";
  else if (scores.length < 1 || scores.length > 64) errors.strokeScores = "Số nét phải từ 1 đến 64";
  else if (scores.some((s) => s < 0 || s > 100)) errors.strokeScores = "Điểm nét phải từ 0 đến 100";
  if (req.avgScore == null) errors.avgScore = "Thiếu điểm trung bình";
  else if (req.avgScore < 0 || req.avgScore > 100) errors.avgScore = "Điểm trung bình phải từ 0 đến 100";
  if (req.durationMs != null && req.durationMs < 0) errors.durationMs = "durationMs không được âm";
  if (Object.keys(errors).length) throw validation(errors);

  ensureWithinQuota(db, user, FEATURE_DAILY_WRITING);
  const character = req.kanaCharacterId! >= 1 ? kanaById(req.kanaCharacterId!) : undefined;
  if (!character) throw notFound("Không tìm thấy ký tự kana cần luyện viết");

  const avgScore = Math.trunc(req.avgScore!);
  const anyStrokeFailed = (req.strokeErrors ?? []).length > 0;
  const grade = gradeFromScore(avgScore, anyStrokeFailed);
  const passed = grade >= 3;

  const d = dataFor(db, user);
  const key = String(character.id);
  // Phải hỏi trước khi lưu lần này, nếu không chính nó sẽ làm mất phần thưởng "đạt lần đầu".
  const alreadyPassedBefore = d.writing.passed[key] === true;

  d.writing.best[key] = Math.max(d.writing.best[key] ?? 0, avgScore);
  if (passed) d.writing.passed[key] = true;
  d.writing.recent = [avgScore, ...d.writing.recent].slice(0, 10);

  const now = nowMs();
  let card = d.cards.find((c) => c.itemType === "KANA_WRITING" && c.itemId === character.id);
  if (!card) { card = newCard(db, "KANA_WRITING", character.id, now); d.cards.push(card); }
  const result = applyFsrs(card, grade, now);

  const firstPass = passed && !alreadyPassedBefore;
  const xp = firstPass ? XP_WRITING_FIRST_PASS : reviewXp(grade);
  const outcome = recordActivity(db, user, writingDelta(xp, req.durationMs ?? 0));
  const newBadges = evaluateBadges(db, user, "WRITING_ATTEMPT");

  return {
    passed, avgScore, grade, xpEarned: outcome.xpAwarded,
    card: gradeResult(card, result.intervalDays, outcome.xpAwarded), newBadges,
  };
}

// ------------------------------------------------------------------ tiến độ

/** Mức thuộc cho lưới bảng chữ theo thang 0..2 mà frontend hiểu (types.ts / KanaGrid):
 *  0 chưa học · 1 đang học · 2 đã thuộc chắc (REVIEW và stability ≥ 21 ngày, cùng ngưỡng `kanaMastered`). */
const masteryLevel = (card: LocalCard | undefined): 0 | 1 | 2 =>
  !card || card.state === "NEW" ? 0 : card.state === "REVIEW" && card.stability >= MASTERY_STABILITY_DAYS ? 2 : 1;

export function kanaList(script: string | null, group: string | null): KanaCharacterDto[] {
  return KANA_CATALOG.filter((k) => (!script || k.script === script) && (!group || k.group === group));
}

export function kanaProgress(db: Db, user: LocalUser, script: string | null): KanaProgressDto[] {
  const d = dataFor(db, user);
  const cards = new Map(d.cards.filter((c) => c.itemType === "KANA_WRITING").map((c) => [c.itemId, c]));
  return kanaList(script, null).map((k) => {
    const card = cards.get(k.id);
    return {
      characterId: k.id, character: k.character, state: (card?.state ?? "NEW") as CardState,
      dueAt: card?.dueAt ?? null,
      // Backend trả null cho ký tự chưa viết lần nào dù kiểu khai báo là number.
      bestScore: (d.writing.best[String(k.id)] ?? null) as number,
      level: masteryLevel(card),
    };
  });
}

export function progressSummary(db: Db, user: LocalUser): ProgressSummaryDto {
  const cards = dataFor(db, user).cards;
  const now = nowMs();
  const newAvailable = cards.filter((c) => c.state === "NEW").length;
  return {
    kanaLearned: cards.filter((c) => c.itemType === "KANA_WRITING" && c.state !== "NEW").length,
    kanaMastered: cards.filter((c) => c.itemType === "KANA_WRITING" && c.state === "REVIEW" && c.stability >= MASTERY_STABILITY_DAYS).length,
    vocabLearned: cards.filter((c) => !isKana(c.itemType) && c.state !== "NEW").length,
    dueToday: cards.filter((c) => c.state !== "NEW" && Date.parse(c.dueAt) <= now).length,
    newAvailable: Math.min(newAvailable, NEW_CARDS_PER_DAY),
  };
}

// ------------------------------------------------------------------ từ vựng

export function searchVocabulary(user: LocalUser, level: number | null, q: string | null, page: number, size: number): Page<VocabularyDto> {
  const minLevel = minJlptLevel(user);
  const keyword = (q ?? "").trim().toLowerCase();
  const rows = VOCABULARY.filter((v) => {
    if (!(v.jlptLevel === null || v.jlptLevel >= minLevel)) return false;
    if (level !== null && v.jlptLevel !== level) return false;
    if (!keyword) return true;
    return [v.word, v.reading, v.romaji, v.meaningVi].some((s) => s.toLowerCase().includes(keyword));
  });
  const p = Math.max(page, 0);
  const s = Math.min(Math.max(size, 1), 2000);
  return { content: rows.slice(p * s, p * s + s), page: p, size: s, totalElements: rows.length, totalPages: Math.ceil(rows.length / s) };
}
