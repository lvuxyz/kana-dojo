/** XP, cấp độ, streak, huy hiệu, bảng xếp hạng, hạn mức gói — port của GamificationService, BadgeService,
 *  LeaderboardService và EntitlementService (docs/SPEC.md §4). */
import type { BadgeDto, HeatmapDay, LeaderboardDto, StatsDto } from "../types";
import { BADGES, KANA_CATALOG, PLAN_FEATURES } from "./content";
import { nowMs, userData, type Db, type LocalStats, type LocalUser, type UserData } from "./db";
import { quotaExceeded } from "./errors";
import { addDays, daysBetween, LEAGUE_ZONE, localDate, localHour, mondayOf } from "./time";

export const XP_REVIEW_CORRECT = 10;
export const XP_REVIEW_WRONG = 3;
export const XP_WRITING_FIRST_PASS = 25;
export const XP_QUIZ_BASE = 20;
export const XP_QUIZ_PER_CORRECT = 5;
export const XP_DAILY_GOAL_BONUS = 50;
export const MAX_STREAK_FREEZES = 2;
/** `app.srs.new-cards-per-day` */
export const NEW_CARDS_PER_DAY = 10;

export const FEATURE_DAILY_REVIEWS = "srs.daily_reviews";
export const FEATURE_DAILY_WRITING = "writing.daily_attempts";
export const FEATURE_JLPT_LEVELS = "content.jlpt_levels";
export const FEATURE_HISTORY_DAYS = "stats.history_days";
const UNLIMITED_DAYS = 36500;

export type BadgeEvent = "WRITING_ATTEMPT" | "REVIEW_GRADED" | "QUIZ_SUBMITTED";

export interface ActivityDelta { xp: number; reviewsDone: number; charsWritten: number; studyMs: number; writingMs: number }
export const reviewDelta = (xp: number, ms: number): ActivityDelta =>
  ({ xp, reviewsDone: 1, charsWritten: 0, studyMs: Math.max(ms, 0), writingMs: 0 });
export const writingDelta = (xp: number, ms: number): ActivityDelta =>
  ({ xp, reviewsDone: 1, charsWritten: 1, studyMs: Math.max(ms, 0), writingMs: Math.max(ms, 0) });
export const quizDelta = (xp: number, ms: number): ActivityDelta =>
  ({ xp, reviewsDone: 0, charsWritten: 0, studyMs: Math.max(ms, 0), writingMs: 0 });

export interface ActivityOutcome { xpAwarded: number; goalMetNow: boolean; currentStreak: number; level: number }

export const reviewXp = (grade: number) => (grade >= 2 ? XP_REVIEW_CORRECT : XP_REVIEW_WRONG);
export const quizXp = (correctCount: number) => XP_QUIZ_BASE + correctCount * XP_QUIZ_PER_CORRECT;
export const levelFor = (xpTotal: number) => Math.floor(Math.sqrt(Math.max(xpTotal, 0) / 100)) + 1;

/** XP còn thiếu để lên cấp kế tiếp; mốc của cấp L là 100·L². */
export function xpToNextLevel(xpTotal: number): number {
  const level = levelFor(xpTotal);
  return Math.max(100 * level * level - xpTotal, 0);
}

export const todayOf = (user: LocalUser) => localDate(user.timezone, nowMs());
const leagueWeek = () => mondayOf(localDate(LEAGUE_ZONE, nowMs()));

/** Dữ liệu học của người dùng, kèm việc hồi thẻ băng mỗi sáng thứ Hai (thay cho job @Scheduled). */
export function dataFor(db: Db, user: LocalUser): UserData {
  const week = leagueWeek();
  const d = userData(db, user.id, week);
  if (d.stats.freezeRefillWeek < week) {
    d.stats.streakFreezes = MAX_STREAK_FREEZES;
    d.stats.freezeRefillWeek = week;
  }
  return d;
}

/** Luật streak theo ngày địa phương (xem GamificationService.advanceStreak). */
function advanceStreak(stats: LocalStats, today: string) {
  const last = stats.lastActiveDate;
  if (last === null) {
    stats.currentStreak = 1;
  } else if (last === today) {
    return; // đã tính cho hôm nay
  } else if (addDays(last, 1) === today) {
    stats.currentStreak += 1;
  } else {
    const gap = daysBetween(last, today);
    if (gap === 2 && stats.streakFreezes > 0) {
      stats.streakFreezes -= 1;
      stats.currentStreak += 1;
    } else {
      stats.currentStreak = 1;
    }
  }
  stats.lastActiveDate = today;
  stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
}

/** Cộng XP, cập nhật tổng hợp ngày và streak. Streak chỉ tăng khi vượt mục tiêu XP ngày. */
export function recordActivity(db: Db, user: LocalUser, delta: ActivityDelta): ActivityOutcome {
  const d = dataFor(db, user);
  const today = todayOf(user);
  const act = (d.daily[today] ??= { xpEarned: 0, reviewsDone: 0, charsWritten: 0, studyMs: 0, goalMet: false });

  act.xpEarned += delta.xp;
  act.reviewsDone += delta.reviewsDone;
  act.charsWritten += delta.charsWritten;
  act.studyMs += delta.studyMs;

  let xpAwarded = delta.xp;
  let goalMetNow = false;
  const goal = user.dailyGoalXp ?? 50;
  if (!act.goalMet && act.xpEarned >= goal) {
    goalMetNow = true;
    act.goalMet = true;
    act.xpEarned += XP_DAILY_GOAL_BONUS;
    xpAwarded += XP_DAILY_GOAL_BONUS;
    advanceStreak(d.stats, today);
  }

  const s = d.stats;
  s.xpTotal += xpAwarded;
  s.level = levelFor(s.xpTotal);
  s.totalReviews += delta.reviewsDone;
  s.totalWritingMs += delta.writingMs;
  return { xpAwarded, goalMetNow, currentStreak: s.currentStreak, level: s.level };
}

export function statsDto(db: Db, user: LocalUser): StatsDto {
  const d = dataFor(db, user);
  const act = d.daily[todayOf(user)];
  const goal = user.dailyGoalXp ?? 50;
  return {
    xpTotal: d.stats.xpTotal,
    level: d.stats.level,
    xpToNextLevel: xpToNextLevel(d.stats.xpTotal),
    currentStreak: d.stats.currentStreak,
    longestStreak: d.stats.longestStreak,
    streakFreezes: d.stats.streakFreezes,
    todayXp: act?.xpEarned ?? 0,
    dailyGoalXp: goal,
    goalMet: act?.goalMet ?? false,
  };
}

export function heatmap(db: Db, user: LocalUser, days: number): HeatmapDay[] {
  const d = dataFor(db, user);
  const today = todayOf(user);
  const allowed = historyDays(user);
  const span = Math.min(Math.max(days, 1), allowed);
  const from = addDays(today, -(span - 1));
  return Object.keys(d.daily)
    .filter((date) => date >= from && date <= today)
    .sort()
    .map((date) => ({ date, xp: d.daily[date].xpEarned, reviews: d.daily[date].reviewsDone }));
}

// ---------------------------------------------------------------- hạn mức gói

const limitOf = (user: LocalUser, key: string): number | null => PLAN_FEATURES[user.plan]?.[key] ?? null;

/** Cấp JLPT thấp nhất (theo số) mà gói được xem: FREE = 5 chỉ N5, PRO = 1 tới N1. */
export const minJlptLevel = (user: LocalUser) => limitOf(user, FEATURE_JLPT_LEVELS) ?? 1;
export const historyDays = (user: LocalUser) => limitOf(user, FEATURE_HISTORY_DAYS) ?? UNLIMITED_DAYS;

/** Mức đã dùng trong ngày địa phương: số lượt ôn (gồm cả lượt viết) và số ký tự đã viết. */
export function usageOf(db: Db, user: LocalUser): Record<string, number> {
  const act = dataFor(db, user).daily[todayOf(user)];
  return { [FEATURE_DAILY_REVIEWS]: act?.reviewsDone ?? 0, [FEATURE_DAILY_WRITING]: act?.charsWritten ?? 0 };
}

export function entitlementsOf(db: Db, user: LocalUser) {
  return { plan: user.plan, features: { ...PLAN_FEATURES[user.plan] }, usage: usageOf(db, user) };
}

/** Chặn trước khi thực hiện hành động bị tính hạn mức (HTTP 429, như QuotaExceededException). */
export function ensureWithinQuota(db: Db, user: LocalUser, featureKey: string) {
  const limit = limitOf(user, featureKey);
  if (limit === null) return;
  if ((usageOf(db, user)[featureKey] ?? 0) < limit) return;
  const what = featureKey === FEATURE_DAILY_REVIEWS ? "lượt ôn" : featureKey === FEATURE_DAILY_WRITING ? "lượt luyện viết" : null;
  throw quotaExceeded(featureKey, limit, what
    ? `Bạn đã đạt hạn mức ${limit} ${what} mỗi ngày của gói miễn phí. Nâng cấp lên PRO để ${featureKey === FEATURE_DAILY_REVIEWS ? "ôn" : "luyện"} không giới hạn.`
    : `Bạn đã đạt hạn mức ${limit} của tính năng ${featureKey} trong gói hiện tại.`);
}

// ------------------------------------------------------------------ huy hiệu

const PERFECT_STREAK_LENGTH = 10;
const PERFECT_MIN_SCORE = 95;
const NIGHT_OWL_HOUR = 23;
const REVIEW_MILESTONE = 1000;

/** Thuộc đủ các ký tự cơ bản của một bảng chữ: mọi thẻ viết đều đã tốt nghiệp sang REVIEW. */
function hasMasteredBasicScript(d: UserData, script: "HIRAGANA" | "KATAKANA"): boolean {
  const basic = KANA_CATALOG.filter((k) => k.script === script && k.group === "BASIC");
  if (basic.length === 0) return false;
  const ids = new Set(basic.map((k) => k.id));
  const mastered = d.cards.filter((c) => c.itemType === "KANA_WRITING" && c.state === "REVIEW" && ids.has(c.itemId)).length;
  return mastered >= basic.length;
}

/** Xét huy hiệu sau mỗi lần ghi nhận hoạt động; trả về mã các huy hiệu vừa đạt. */
export function evaluateBadges(db: Db, user: LocalUser, event: BadgeEvent): string[] {
  const d = dataFor(db, user);
  const candidates: string[] = [];

  if (event === "WRITING_ATTEMPT") {
    if (Object.keys(d.writing.passed).length > 0) candidates.push("FIRST_STROKE");
    const r = d.writing.recent;
    if (r.length >= PERFECT_STREAK_LENGTH && r.every((s) => s >= PERFECT_MIN_SCORE)) candidates.push("PERFECT_10");
  }
  if (event === "WRITING_ATTEMPT" || event === "REVIEW_GRADED") {
    if (hasMasteredBasicScript(d, "HIRAGANA")) candidates.push("HIRAGANA_MASTER");
    if (hasMasteredBasicScript(d, "KATAKANA")) candidates.push("KATAKANA_MASTER");
    if (d.stats.totalReviews >= REVIEW_MILESTONE) candidates.push("REVIEW_1000");
  }
  // "Cú đêm" theo giờ địa phương của chính người học.
  if (localHour(user.timezone, nowMs()) >= NIGHT_OWL_HOUR) candidates.push("NIGHT_OWL");

  const streak = d.stats.currentStreak;
  if (streak >= 7) candidates.push("STREAK_7");
  if (streak >= 30) candidates.push("STREAK_30");
  if (streak >= 100) candidates.push("STREAK_100");

  const awarded: string[] = [];
  for (const code of candidates) {
    if (d.badges[code] || !BADGES.some((b) => b.code === code)) continue;
    d.badges[code] = new Date(nowMs()).toISOString();
    awarded.push(code);
  }
  return awarded;
}

export function listBadges(db: Db, user: LocalUser): BadgeDto[] {
  const d = dataFor(db, user);
  return BADGES.map((b) => ({
    code: b.code, nameVi: b.nameVi, descriptionVi: b.descriptionVi, icon: b.icon, tier: b.tier,
    earnedAt: d.badges[b.code] ?? null,
  }));
}

// -------------------------------------------------------------- bảng xếp hạng

/** Bảng xếp hạng tuần đang chạy (thứ Hai 00:00 giờ VN), tính từ hoạt động theo ngày của mọi tài khoản trên máy này. */
export function weeklyLeaderboard(db: Db, currentUserId: number, limit: number): LeaderboardDto {
  const weekStart = leagueWeek();
  const today = localDate(LEAGUE_ZONE, nowMs());
  const size = Math.min(Math.max(limit, 1), 200);

  const totals = db.users.map((u) => {
    const d = db.data[String(u.id)];
    let xp = 0;
    if (d) for (const [date, a] of Object.entries(d.daily)) if (date >= weekStart && date <= today) xp += a.xpEarned;
    return { user: u, xp };
  }).filter((t) => t.xp > 0)
    .sort((a, b) => b.xp - a.xp || a.user.id - b.user.id);

  const entries = totals.slice(0, size).map((t, i) => ({
    rank: i + 1, userId: t.user.id, displayName: t.user.displayName, avatarUrl: t.user.avatarUrl, xp: t.xp,
  }));

  let myRank = entries.find((e) => e.userId === currentUserId)?.rank ?? null;
  if (myRank === null) {
    const mine = totals.find((t) => t.user.id === currentUserId)?.xp ?? 0;
    if (mine > 0) myRank = totals.filter((t) => t.xp > mine).length + 1;
  }
  return { weekStart, myRank, entries };
}
