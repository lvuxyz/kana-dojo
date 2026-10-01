import { BADGES } from "@/data/badges";
import { KANA, type Script } from "../kana";
import type { BadgeStatus } from "../types";
import { cardKey } from "./cards";
import type { ProgressState } from "./state";
import { hourOf, type Clock } from "./time";

/* Xét huy hiệu sau mỗi lần ghi nhận hoạt động.
   Chỉ chạy những phép kiểm tra mà sự kiện vừa xảy ra có thể làm thay đổi kết quả. */

export type BadgeEvent = "WRITING_ATTEMPT" | "REVIEW_GRADED" | "QUIZ_SUBMITTED";

const PERFECT_STREAK_LENGTH = 10;
const PERFECT_MIN_SCORE = 95;
const NIGHT_OWL_HOUR = 23;
const REVIEW_MILESTONE = 1000;

/** Thuộc đủ 46 ký tự cơ bản của một bảng chữ: mọi thẻ viết đều đã tốt nghiệp sang REVIEW. */
function hasMasteredBasicScript(state: ProgressState, script: Script): boolean {
  const basics = KANA.chars.filter((c) => c.s === script && c.g === "basic");
  if (basics.length === 0) return false;
  return basics.every((c) => state.cards[cardKey("KANA_WRITING", c.c)]?.state === "REVIEW");
}

/** 10 lần viết gần nhất đều từ 95 điểm trở lên và phải đủ 10 lần. */
function hasPerfectStreak(state: ProgressState): boolean {
  const { recent } = state.writing;
  return recent.length >= PERFECT_STREAK_LENGTH && recent.every((s) => s >= PERFECT_MIN_SCORE);
}

/** Xét toàn bộ điều kiện liên quan tới sự kiện, ghi huy hiệu mới vào bản nháp và trả về mã các huy hiệu vừa đạt.
 *  Danh sách rỗng là trường hợp thường gặp nhất. */
export function evaluateBadges(draft: ProgressState, event: BadgeEvent, clock: Clock): string[] {
  const candidates: string[] = [];

  if (event === "WRITING_ATTEMPT") {
    if (draft.writing.passed.length > 0) candidates.push("FIRST_STROKE");
    if (hasPerfectStreak(draft)) candidates.push("PERFECT_10");
  }

  if (event === "WRITING_ATTEMPT" || event === "REVIEW_GRADED") {
    if (hasMasteredBasicScript(draft, "h")) candidates.push("HIRAGANA_MASTER");
    if (hasMasteredBasicScript(draft, "k")) candidates.push("KATAKANA_MASTER");
    if (draft.stats.totalReviews >= REVIEW_MILESTONE) candidates.push("REVIEW_1000");
  }

  // "Cú đêm" phụ thuộc giờ địa phương của chính người học.
  if (hourOf(clock.now, clock.zone) >= NIGHT_OWL_HOUR) candidates.push("NIGHT_OWL");

  const streak = draft.stats.currentStreak;
  if (streak >= 7) candidates.push("STREAK_7");
  if (streak >= 30) candidates.push("STREAK_30");
  if (streak >= 100) candidates.push("STREAK_100");

  const awarded: string[] = [];
  for (const code of candidates) {
    if (code in draft.badges) continue;
    draft.badges[code] = clock.now;
    awarded.push(code);
  }
  return awarded;
}

/** Toàn bộ huy hiệu kèm thời điểm đạt (null nếu chưa đạt), theo thứ tự trong danh mục. */
export function badgeStatuses(state: ProgressState): BadgeStatus[] {
  return BADGES.map((b) => ({ ...b, earnedAt: state.badges[b.code] ?? null }));
}
