import type { Grade, HeatmapDay, StatsView } from "../types";
import { MAX_STREAK_FREEZES, type ProgressState } from "./state";
import { addDays, dayKey, daysBetween, weekStart, type Clock } from "./time";

/* XP, cấp độ, streak và tổng hợp hoạt động theo ngày.
   Các hàm `record*` nhận một *bản nháp* ProgressState và sửa trực tiếp — người gọi (actions.ts) đã sao chép
   trạng thái trước đó, nên không có hiệu ứng phụ nào lọt ra ngoài. */

export const XP_REVIEW_CORRECT = 10;
export const XP_REVIEW_WRONG = 3;
export const XP_WRITING_FIRST_PASS = 25;
export const XP_QUIZ_BASE = 20;
export const XP_QUIZ_PER_CORRECT = 5;
export const XP_DAILY_GOAL_BONUS = 50;

/** XP cho một lượt ôn: trả lời sai vẫn được thưởng để không phạt hành vi học. */
export function reviewXp(grade: Grade): number {
  return grade >= 2 ? XP_REVIEW_CORRECT : XP_REVIEW_WRONG;
}

export function quizXp(correctCount: number): number {
  return XP_QUIZ_BASE + correctCount * XP_QUIZ_PER_CORRECT;
}

export function levelFor(xpTotal: number): number {
  return Math.floor(Math.sqrt(Math.max(xpTotal, 0) / 100)) + 1;
}

/** XP còn thiếu để lên cấp kế tiếp; mốc của cấp L là 100 * (L-1)^2. */
export function xpToNextLevel(xpTotal: number): number {
  const level = levelFor(xpTotal);
  return Math.max(100 * level * level - xpTotal, 0);
}

/** Lượng hoạt động cần ghi nhận của một thao tác học. */
export interface ActivityDelta { xp: number; reviewsDone: number; charsWritten: number; studyMs: number; writingMs: number }

const nonNeg = (n: number) => Math.max(Math.round(n) || 0, 0);

export const reviewDelta = (xp: number, durationMs: number): ActivityDelta =>
  ({ xp, reviewsDone: 1, charsWritten: 0, studyMs: nonNeg(durationMs), writingMs: 0 });

export const writingDelta = (xp: number, durationMs: number): ActivityDelta =>
  ({ xp, reviewsDone: 1, charsWritten: 1, studyMs: nonNeg(durationMs), writingMs: nonNeg(durationMs) });

export const quizDelta = (xp: number, durationMs: number): ActivityDelta =>
  ({ xp, reviewsDone: 0, charsWritten: 0, studyMs: nonNeg(durationMs), writingMs: 0 });

/** Kết quả ghi nhận: tổng XP thực nhận (đã gồm thưởng) và streak sau khi cập nhật. */
export interface ActivityOutcome { xpAwarded: number; goalMetNow: boolean; currentStreak: number; level: number }

/** Thẻ băng được hồi đầy vào mỗi Thứ Hai (giờ địa phương). Trả về số thẻ hiện có sau khi xét tuần.
 *  Chỉ hồi khi sang tuần MỚI hơn tuần đã hồi: ngày địa phương có thể lùi (bay về phía tây, chỉnh đồng hồ) và
 *  lùi qua Thứ Hai không được tính là một tuần mới. */
function freezesFor(stats: ProgressState["stats"], today: string): { freezes: number; week: string } {
  const week = weekStart(today);
  return stats.freezeWeek !== null && week <= stats.freezeWeek
    ? { freezes: stats.streakFreezes, week: stats.freezeWeek }
    : { freezes: MAX_STREAK_FREEZES, week };
}

/** Cộng XP, cập nhật tổng hợp ngày và streak. Chỉ khi vượt mục tiêu XP ngày thì streak mới tăng — mở app không tính. */
export function recordActivity(draft: ProgressState, delta: ActivityDelta, clock: Clock): ActivityOutcome {
  const today = dayKey(clock.now, clock.zone);
  const { stats } = draft;

  const { freezes, week } = freezesFor(stats, today);
  stats.streakFreezes = freezes;
  stats.freezeWeek = week;

  const day = (draft.daily[today] ??= { xp: 0, reviews: 0, chars: 0, studyMs: 0, goalMet: false });
  day.xp += delta.xp;
  day.reviews += delta.reviewsDone;
  day.chars += delta.charsWritten;
  day.studyMs += delta.studyMs;

  let xpAwarded = delta.xp;
  let goalMetNow = false;

  if (!day.goalMet && day.xp >= draft.settings.dailyGoalXp) {
    goalMetNow = true;
    day.goalMet = true;
    day.xp += XP_DAILY_GOAL_BONUS;
    xpAwarded += XP_DAILY_GOAL_BONUS;
    advanceStreak(stats, today);
  }

  stats.xpTotal += xpAwarded;
  stats.totalReviews += delta.reviewsDone;
  stats.totalWritingMs += delta.writingMs;

  return { xpAwarded, goalMetNow, currentStreak: stats.currentStreak, level: levelFor(stats.xpTotal) };
}

/** Luật streak theo ngày địa phương:
 *  - cùng ngày, hoặc ngày địa phương lùi về trước ngày đã tính (đổi múi giờ, chỉnh đồng hồ) → giữ nguyên;
 *  - đúng ngày kế tiếp → +1;
 *  - hở đúng một ngày và còn thẻ băng → tiêu một thẻ, streak vẫn +1;
 *  - các trường hợp còn lại → đặt lại về 1. */
function advanceStreak(stats: ProgressState["stats"], today: string): void {
  const last = stats.lastActiveDate;
  if (last === null) {
    stats.currentStreak = 1;
  } else {
    const gap = daysBetween(last, today);
    if (gap <= 0) {
      return; // đã tính cho ngày này hoặc một ngày sau nó rồi
    } else if (gap === 1) {
      stats.currentStreak += 1;
    } else if (gap === 2 && stats.streakFreezes > 0) {
      stats.streakFreezes -= 1;
      stats.currentStreak += 1;
    } else {
      stats.currentStreak = 1;
    }
  }
  stats.lastActiveDate = today;
  stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
}

export function statsOf(state: ProgressState, clock: Clock): StatsView {
  const today = dayKey(clock.now, clock.zone);
  const day = state.daily[today];
  const { stats } = state;
  return {
    xpTotal: stats.xpTotal,
    level: levelFor(stats.xpTotal),
    xpToNextLevel: xpToNextLevel(stats.xpTotal),
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
    streakFreezes: freezesFor(stats, today).freezes,
    todayXp: day?.xp ?? 0,
    dailyGoalXp: state.settings.dailyGoalXp,
    goalMet: day?.goalMet ?? false,
  };
}

/** `days` ngày gần nhất, từ cũ đến mới, kể cả ngày không có hoạt động (xp = 0). */
export function heatmapOf(state: ProgressState, days: number, clock: Clock): HeatmapDay[] {
  const today = dayKey(clock.now, clock.zone);
  const out: HeatmapDay[] = [];
  for (let i = Math.max(days, 1) - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const d = state.daily[date];
    out.push({ date, xp: d?.xp ?? 0, reviews: d?.reviews ?? 0 });
  }
  return out;
}
