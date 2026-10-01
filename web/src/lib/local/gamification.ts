/* XP, level, streak, huy hiệu — bản port của GamificationService.java và BadgeService.java.
   Mọi phép tính ngày đều theo MÚI GIỜ CỦA NGƯỜI HỌC (profile.timezone), không phải UTC. */

import type { BadgeDto, HeatmapDay, StatsDto } from "../types";
import badgeCatalog from "../../data/badges.json";
import { KANA_LIST } from "./catalog";
import type { LocalState } from "./store";
import { addDays, dateInZone, daysBetween, hourInZone, mondayOf } from "./time";

export const XP_REVIEW_CORRECT = 10;
export const XP_REVIEW_WRONG = 3;
export const XP_WRITING_FIRST_PASS = 25;
export const XP_QUIZ_BASE = 20;
export const XP_QUIZ_PER_CORRECT = 5;
export const XP_DAILY_GOAL_BONUS = 50;
export const MAX_STREAK_FREEZES = 2;
export const NEW_CARDS_PER_DAY = 10;

export const reviewXp = (grade: number) => (grade >= 2 ? XP_REVIEW_CORRECT : XP_REVIEW_WRONG);
export const quizXp = (correct: number) => XP_QUIZ_BASE + correct * XP_QUIZ_PER_CORRECT;
export const levelFor = (xpTotal: number) => Math.floor(Math.sqrt(Math.max(xpTotal, 0) / 100)) + 1;
/** XP còn thiếu để lên cấp kế tiếp; mốc của cấp L là 100·(L-1)². */
export const xpToNextLevel = (xpTotal: number) => Math.max(100 * levelFor(xpTotal) ** 2 - xpTotal, 0);

export interface ActivityDelta { xp: number; reviewsDone: number; charsWritten: number; studyMs: number; writingMs: number }
const ms = (v: number | null | undefined) => Math.max(v ?? 0, 0);
export const activity = {
  review: (xp: number, durationMs?: number | null): ActivityDelta =>
    ({ xp, reviewsDone: 1, charsWritten: 0, studyMs: ms(durationMs), writingMs: 0 }),
  writing: (xp: number, durationMs?: number | null): ActivityDelta =>
    ({ xp, reviewsDone: 1, charsWritten: 1, studyMs: ms(durationMs), writingMs: ms(durationMs) }),
  quiz: (xp: number, durationMs?: number | null): ActivityDelta =>
    ({ xp, reviewsDone: 0, charsWritten: 0, studyMs: ms(durationMs), writingMs: 0 }),
};

export interface ActivityOutcome { xpAwarded: number; goalMetNow: boolean; currentStreak: number; level: number }

export const todayOf = (state: LocalState, now: Date) => dateInZone(state.profile.timezone, now);

/** Thẻ băng sau khi áp dụng việc hồi mỗi thứ Hai (backend làm bằng job 00:00 thứ Hai). */
function freezesAfterRefill(stats: LocalState["stats"], today: string): { freezes: number; week: string } {
  const week = mondayOf(today);
  const due = stats.lastFreezeRefill !== null && week > stats.lastFreezeRefill;
  return { freezes: due ? Math.max(stats.streakFreezes, MAX_STREAK_FREEZES) : stats.streakFreezes, week };
}

function refillFreezes(state: LocalState, today: string) {
  const { freezes, week } = freezesAfterRefill(state.stats, today);
  state.stats.streakFreezes = freezes;
  state.stats.lastFreezeRefill = week;
}

/**
 * Luật streak theo ngày địa phương: cùng ngày → giữ; ngày kế tiếp → +1; hở đúng một ngày và còn thẻ băng →
 * tiêu một thẻ, vẫn +1; còn lại → về 1.
 */
function advanceStreak(stats: LocalState["stats"], today: string) {
  const last = stats.lastActiveDate;
  if (last === null) {
    stats.currentStreak = 1;
  } else if (last === today) {
    return;
  } else if (daysBetween(last, today) === 1) {
    stats.currentStreak += 1;
  } else if (daysBetween(last, today) === 2 && stats.streakFreezes > 0) {
    stats.streakFreezes -= 1;
    stats.currentStreak += 1;
  } else {
    stats.currentStreak = 1;
  }
  stats.lastActiveDate = today;
  stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
}

/** Cộng XP, cập nhật tổng hợp ngày và streak. Chỉ khi vượt mục tiêu XP ngày thì streak mới tăng. */
export function recordActivity(state: LocalState, delta: ActivityDelta, now: Date): ActivityOutcome {
  const today = todayOf(state, now);
  refillFreezes(state, today);

  const day = (state.daily[today] ??= { xp: 0, reviews: 0, chars: 0, studyMs: 0, goalMet: false });
  day.xp += delta.xp;
  day.reviews += delta.reviewsDone;
  day.chars += delta.charsWritten;
  day.studyMs += delta.studyMs;

  let xpAwarded = delta.xp;
  let goalMetNow = false;
  const goal = state.profile.dailyGoalXp || 50;
  if (!day.goalMet && day.xp >= goal) {
    goalMetNow = true;
    day.goalMet = true;
    day.xp += XP_DAILY_GOAL_BONUS;
    xpAwarded += XP_DAILY_GOAL_BONUS;
    advanceStreak(state.stats, today);
  }

  const stats = state.stats;
  stats.xpTotal += xpAwarded;
  stats.level = levelFor(stats.xpTotal);
  stats.totalReviews += delta.reviewsDone;
  stats.totalWritingMs += delta.writingMs;

  return { xpAwarded, goalMetNow, currentStreak: stats.currentStreak, level: stats.level };
}

export function statsDto(state: LocalState, now: Date): StatsDto {
  const today = todayOf(state, now);
  const s = state.stats;
  const day = state.daily[today];
  return {
    xpTotal: s.xpTotal,
    level: s.level,
    xpToNextLevel: xpToNextLevel(s.xpTotal),
    currentStreak: s.currentStreak,
    longestStreak: s.longestStreak,
    streakFreezes: freezesAfterRefill(s, today).freezes,
    todayXp: day?.xp ?? 0,
    dailyGoalXp: state.profile.dailyGoalXp || 50,
    goalMet: !!day?.goalMet,
  };
}

/** Heatmap theo ngày địa phương; chỉ gồm những ngày có hoạt động, cũ → mới. */
export function heatmap(state: LocalState, days: number, now: Date): HeatmapDay[] {
  const today = todayOf(state, now);
  const from = addDays(today, -(Math.max(days, 1) - 1));
  return Object.entries(state.daily)
    .filter(([date]) => date >= from && date <= today)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, d]) => ({ date, xp: d.xp, reviews: d.reviews }));
}

// ---------------------------------------------------------------------------
// Huy hiệu
// ---------------------------------------------------------------------------

export type BadgeEvent = "WRITING_ATTEMPT" | "REVIEW_GRADED" | "QUIZ_SUBMITTED";

const PERFECT_STREAK_LENGTH = 10;
const PERFECT_MIN_SCORE = 95;
const NIGHT_OWL_HOUR = 23;
const REVIEW_MILESTONE = 1000;

/** Thuộc đủ các ký tự cơ bản của một bảng chữ: mọi thẻ viết đều đã tốt nghiệp sang REVIEW. */
function masteredBasicScript(state: LocalState, script: "h" | "k"): boolean {
  const basic = KANA_LIST.filter((k) => k.s === script && k.g === "basic");
  if (basic.length === 0) return false;
  return basic.every((k) => state.cards[`KANA_WRITING:${k.id}`]?.state === "REVIEW");
}

/** Xét các huy hiệu liên quan tới sự kiện vừa xảy ra; trả về mã những huy hiệu vừa đạt. */
export function evaluateBadges(state: LocalState, event: BadgeEvent, now: Date): string[] {
  const candidates: string[] = [];

  if (event === "WRITING_ATTEMPT") {
    if (Object.keys(state.writing.passed).length > 0) candidates.push("FIRST_STROKE");
    const recent = state.writing.recent;
    if (recent.length >= PERFECT_STREAK_LENGTH && recent.slice(0, PERFECT_STREAK_LENGTH).every((s) => s >= PERFECT_MIN_SCORE)) {
      candidates.push("PERFECT_10");
    }
  }
  if (event === "WRITING_ATTEMPT" || event === "REVIEW_GRADED") {
    if (masteredBasicScript(state, "h")) candidates.push("HIRAGANA_MASTER");
    if (masteredBasicScript(state, "k")) candidates.push("KATAKANA_MASTER");
    if (state.stats.totalReviews >= REVIEW_MILESTONE) candidates.push("REVIEW_1000");
  }
  // "Cú đêm" phụ thuộc giờ địa phương của chính người học.
  if (hourInZone(state.profile.timezone, now) >= NIGHT_OWL_HOUR) candidates.push("NIGHT_OWL");

  const streak = state.stats.currentStreak;
  if (streak >= 7) candidates.push("STREAK_7");
  if (streak >= 30) candidates.push("STREAK_30");
  if (streak >= 100) candidates.push("STREAK_100");

  const awarded: string[] = [];
  for (const code of candidates) {
    if (state.badges[code]) continue;
    state.badges[code] = now.toISOString();
    awarded.push(code);
  }
  return awarded;
}

export function badgesDto(state: LocalState): (BadgeDto & { id: number; sortOrder: number })[] {
  return [...badgeCatalog]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((b) => ({
      id: b.id,
      code: b.code,
      nameVi: b.nameVi,
      descriptionVi: b.descriptionVi,
      icon: b.icon,
      tier: b.tier as BadgeDto["tier"],
      sortOrder: b.sortOrder,
      earnedAt: state.badges[b.code] ?? null,
    }));
}
