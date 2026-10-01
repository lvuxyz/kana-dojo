import { beforeEach, describe, expect, it } from "vitest";
import {
  activity, evaluateBadges, heatmap, levelFor, quizXp, recordActivity, reviewXp, statsDto, xpToNextLevel,
} from "./gamification";
import { freshState, type LocalState } from "./store";
import { addDays, dateInZone, daysBetween, hourInZone, mondayOf } from "./time";

const VN = "Asia/Ho_Chi_Minh";
/** 10:00 giờ VN, thứ Tư 2026-09-30. */
const WED = new Date("2026-09-30T03:00:00Z");
const day = (n: number, base = WED) => new Date(base.getTime() + n * 86_400_000);

let state: LocalState;
beforeEach(() => {
  state = freshState(WED);
  state.profile.timezone = VN;
  state.profile.dailyGoalXp = 50;
});

/** Đạt mục tiêu ngày vào thời điểm `at` (một lượt ôn 50 XP là đủ). */
const hitGoal = (at: Date) => recordActivity(state, activity.review(50), at);

describe("công thức XP", () => {
  it("level = floor(sqrt(xp/100)) + 1, ngưỡng cấp kế là 100·L²", () => {
    expect(levelFor(0)).toBe(1);
    expect(levelFor(99)).toBe(1);
    expect(levelFor(100)).toBe(2);
    expect(levelFor(399)).toBe(2);
    expect(levelFor(400)).toBe(3);
    expect(xpToNextLevel(0)).toBe(100);
    expect(xpToNextLevel(150)).toBe(250);
    expect(reviewXp(1)).toBe(3);
    expect(reviewXp(2)).toBe(10);
    expect(quizXp(7)).toBe(55);
  });
});

describe("mục tiêu ngày và streak", () => {
  it("chỉ thưởng +50 và tăng streak khi đạt mục tiêu, và chỉ một lần mỗi ngày", () => {
    const small = recordActivity(state, activity.review(10), WED);
    expect(small.goalMetNow).toBe(false);
    expect(small.xpAwarded).toBe(10);
    expect(state.stats.currentStreak).toBe(0);

    const reach = recordActivity(state, activity.review(40), WED); // tổng 50
    expect(reach.goalMetNow).toBe(true);
    expect(reach.xpAwarded).toBe(90);
    expect(state.stats.currentStreak).toBe(1);

    const again = recordActivity(state, activity.review(10), WED);
    expect(again.goalMetNow).toBe(false);
    expect(again.xpAwarded).toBe(10);
    expect(state.stats.currentStreak).toBe(1);
    expect(state.stats.xpTotal).toBe(10 + 90 + 10);
  });

  it("ngày kế tiếp thì +1, hở đúng một ngày và còn thẻ băng thì tiêu một thẻ", () => {
    hitGoal(WED);
    hitGoal(day(1));
    expect(state.stats.currentStreak).toBe(2);

    hitGoal(day(3)); // bỏ lỡ ngày thứ 3 (một ngày hở)
    expect(state.stats.currentStreak).toBe(3);
    expect(state.stats.streakFreezes).toBe(1);
    expect(state.stats.longestStreak).toBe(3);
  });

  it("hở hai ngày trở lên thì về 1 nhưng giữ kỷ lục", () => {
    hitGoal(WED);
    hitGoal(day(1));
    hitGoal(day(4)); // hở 2 ngày
    expect(state.stats.currentStreak).toBe(1);
    expect(state.stats.longestStreak).toBe(2);
  });

  it("hở một ngày nhưng hết thẻ băng thì cũng về 1", () => {
    hitGoal(WED);
    hitGoal(day(1));
    state.stats.streakFreezes = 0;
    hitGoal(day(3)); // cùng tuần với lần trước nên chưa được hồi thẻ
    expect(state.stats.currentStreak).toBe(1);
    expect(state.stats.longestStreak).toBe(2);
  });

  it("thẻ băng hồi về tối đa 2 vào thứ Hai", () => {
    hitGoal(WED); // thứ Tư: gán mốc hồi của tuần này
    state.stats.streakFreezes = 0;

    expect(statsDto(state, day(1)).streakFreezes).toBe(0); // thứ Năm: chưa tới thứ Hai
    expect(statsDto(state, day(5)).streakFreezes).toBe(2); // thứ Hai tuần sau
    hitGoal(day(5));
    expect(state.stats.streakFreezes).toBe(2);
  });

  it("ngày đổi theo MÚI GIỜ NGƯỜI HỌC, không phải UTC", () => {
    // 20:00 UTC ngày 30/9 = 03:00 ngày 1/10 giờ VN.
    const lateUtc = new Date("2026-09-30T20:00:00Z");
    expect(dateInZone(VN, lateUtc)).toBe("2026-10-01");
    expect(dateInZone("UTC", lateUtc)).toBe("2026-09-30");

    recordActivity(state, activity.review(60), lateUtc);
    expect(Object.keys(state.daily)).toEqual(["2026-10-01"]);

    state.profile.timezone = "America/Los_Angeles";
    expect(statsDto(state, lateUtc).todayXp).toBe(0); // sang múi giờ khác thì "hôm nay" là ngày khác
  });

  it("heatmap chỉ gồm các ngày có hoạt động trong khoảng, cũ → mới", () => {
    hitGoal(day(-10));
    hitGoal(day(-2));
    hitGoal(WED);
    expect(heatmap(state, 3, WED).map((d) => d.date)).toEqual(["2026-09-28", "2026-09-30"]);
    expect(heatmap(state, 365, WED)).toHaveLength(3);
  });
});

describe("huy hiệu", () => {
  it("FIRST_STROKE chỉ khi đã từng viết đạt; không trao lại lần hai", () => {
    expect(evaluateBadges(state, "WRITING_ATTEMPT", WED)).toEqual([]);
    state.writing.passed["1"] = true;
    expect(evaluateBadges(state, "WRITING_ATTEMPT", WED)).toEqual(["FIRST_STROKE"]);
    expect(evaluateBadges(state, "WRITING_ATTEMPT", WED)).toEqual([]);
    // Sự kiện khác không xét huy hiệu viết.
    state.badges = {};
    expect(evaluateBadges(state, "QUIZ_SUBMITTED", WED)).toEqual([]);
  });

  it("PERFECT_10 cần đủ 10 lượt gần nhất đều ≥ 95", () => {
    state.writing.recent = Array(9).fill(100);
    expect(evaluateBadges(state, "WRITING_ATTEMPT", WED)).not.toContain("PERFECT_10");
    state.writing.recent = Array(10).fill(95);
    expect(evaluateBadges(state, "WRITING_ATTEMPT", WED)).toContain("PERFECT_10");
  });

  it("NIGHT_OWL theo giờ địa phương của người học", () => {
    const at2330Vn = new Date("2026-09-30T16:30:00Z");
    expect(hourInZone(VN, at2330Vn)).toBe(23);
    expect(evaluateBadges(state, "REVIEW_GRADED", at2330Vn)).toContain("NIGHT_OWL");

    state.badges = {};
    state.profile.timezone = "UTC";
    expect(evaluateBadges(state, "REVIEW_GRADED", at2330Vn)).not.toContain("NIGHT_OWL");
  });

  it("STREAK_7/30/100 theo streak hiện tại", () => {
    state.stats.currentStreak = 7;
    expect(evaluateBadges(state, "REVIEW_GRADED", WED)).toContain("STREAK_7");
    state.stats.currentStreak = 100;
    const got = evaluateBadges(state, "REVIEW_GRADED", WED);
    expect(got).toEqual(expect.arrayContaining(["STREAK_30", "STREAK_100"]));
    expect(got).not.toContain("STREAK_7"); // đã có từ trước
  });

  it("REVIEW_1000 khi tổng lượt ôn đạt 1000", () => {
    state.stats.totalReviews = 999;
    expect(evaluateBadges(state, "REVIEW_GRADED", WED)).not.toContain("REVIEW_1000");
    state.stats.totalReviews = 1000;
    expect(evaluateBadges(state, "REVIEW_GRADED", WED)).toContain("REVIEW_1000");
  });
});

describe("tiện ích ngày", () => {
  it("cộng/trừ ngày, khoảng cách và thứ Hai đầu tuần", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-09-28", "2026-10-01")).toBe(3);
    expect(mondayOf("2026-09-30")).toBe("2026-09-28"); // thứ Tư → thứ Hai
    expect(mondayOf("2026-09-28")).toBe("2026-09-28");
    expect(mondayOf("2026-10-04")).toBe("2026-09-28"); // Chủ nhật vẫn thuộc tuần bắt đầu thứ Hai trước đó
  });
});
