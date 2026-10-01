import { describe, expect, it } from "vitest";
import {
  XP_DAILY_GOAL_BONUS, heatmapOf, levelFor, quizXp, recordActivity, reviewDelta, reviewXp, statsOf, xpToNextLevel,
} from "./activity";
import { emptyState, type ProgressState } from "./state";
import { addDays, dayKey, daysBetween, hourOf, weekStart, type Clock } from "./time";

const VN = "Asia/Ho_Chi_Minh";
const at = (iso: string, zone = VN): Clock => ({ now: Date.parse(iso), zone });

describe("time", () => {
  it("ngày địa phương theo múi giờ, không phải UTC", () => {
    // 17:30 UTC = 00:30 ngày hôm sau ở Việt Nam
    const ms = Date.parse("2026-09-07T17:30:00Z");
    expect(dayKey(ms, "UTC")).toBe("2026-09-07");
    expect(dayKey(ms, VN)).toBe("2026-09-08");
    expect(hourOf(ms, VN)).toBe(0);
    expect(hourOf(Date.parse("2026-09-07T16:30:00Z"), VN)).toBe(23);
  });

  it("phép tính ngày và tuần", () => {
    expect(daysBetween("2026-09-07", "2026-09-09")).toBe(2);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(addDays("2026-02-27", 2)).toBe("2026-03-01");
    // 2026-09-07 là Thứ Hai
    expect(weekStart("2026-09-07")).toBe("2026-09-07");
    expect(weekStart("2026-09-13")).toBe("2026-09-07"); // Chủ nhật vẫn thuộc tuần bắt đầu Thứ Hai
    expect(weekStart("2026-09-14")).toBe("2026-09-14");
  });
});

describe("XP & cấp độ", () => {
  it("ôn sai vẫn được thưởng ít hơn", () => {
    expect(reviewXp(1)).toBe(3);
    expect(reviewXp(2)).toBe(10);
    expect(reviewXp(4)).toBe(10);
    expect(quizXp(7)).toBe(55);
  });

  it("level = floor(sqrt(xp/100)) + 1 và xpToNextLevel khớp mốc 100·L²", () => {
    expect(levelFor(0)).toBe(1);
    expect(levelFor(99)).toBe(1);
    expect(levelFor(100)).toBe(2);
    expect(levelFor(399)).toBe(2);
    expect(levelFor(400)).toBe(3);
    expect(xpToNextLevel(0)).toBe(100);
    expect(xpToNextLevel(150)).toBe(250);
  });
});

describe("recordActivity — mục tiêu ngày và streak", () => {
  /** Học một ngày: đủ XP để vượt mục tiêu 50. */
  function studyDay(state: ProgressState, iso: string, xp = 50): ProgressState {
    const draft = structuredClone(state);
    recordActivity(draft, reviewDelta(xp, 1000), at(iso));
    return draft;
  }

  it("cộng XP vào ngày và chỉ tăng streak khi đạt mục tiêu", () => {
    const state = emptyState();
    const a = recordActivity(state, reviewDelta(10, 1500), at("2026-09-07T03:00:00Z"));

    expect(a).toMatchObject({ xpAwarded: 10, goalMetNow: false, currentStreak: 0 });
    expect(state.daily["2026-09-07"]).toMatchObject({ xp: 10, reviews: 1, goalMet: false });

    const b = recordActivity(state, reviewDelta(40, 0), at("2026-09-07T04:00:00Z"));
    // Đạt mốc 50 → thưởng thêm 50 và bắt đầu streak
    expect(b).toMatchObject({ xpAwarded: 40 + XP_DAILY_GOAL_BONUS, goalMetNow: true, currentStreak: 1 });
    expect(state.stats.xpTotal).toBe(10 + 40 + XP_DAILY_GOAL_BONUS);
    expect(state.daily["2026-09-07"].xp).toBe(100);

    // Đạt rồi thì hoạt động tiếp trong ngày không thưởng lần nữa, streak không cộng đôi
    const c = recordActivity(state, reviewDelta(10, 0), at("2026-09-07T05:00:00Z"));
    expect(c).toMatchObject({ xpAwarded: 10, goalMetNow: false, currentStreak: 1 });
  });

  it("các ngày liên tiếp nối streak, longestStreak giữ kỷ lục", () => {
    let s = studyDay(emptyState(), "2026-09-07T03:00:00Z");
    s = studyDay(s, "2026-09-08T03:00:00Z");
    s = studyDay(s, "2026-09-09T03:00:00Z");
    expect(s.stats).toMatchObject({ currentStreak: 3, longestStreak: 3, lastActiveDate: "2026-09-09" });

    s = studyDay(s, "2026-09-20T03:00:00Z"); // đứt hẳn
    expect(s.stats).toMatchObject({ currentStreak: 1, longestStreak: 3 });
  });

  it("hở đúng một ngày thì tiêu một thẻ băng, streak vẫn tăng", () => {
    let s = studyDay(emptyState(), "2026-09-07T03:00:00Z"); // Thứ Hai
    expect(s.stats.streakFreezes).toBe(2);
    s = studyDay(s, "2026-09-09T03:00:00Z"); // bỏ Thứ Ba
    expect(s.stats).toMatchObject({ currentStreak: 2, streakFreezes: 1 });
    s = studyDay(s, "2026-09-11T03:00:00Z"); // bỏ Thứ Năm
    expect(s.stats).toMatchObject({ currentStreak: 3, streakFreezes: 0 });
    s = studyDay(s, "2026-09-13T03:00:00Z"); // bỏ Thứ Bảy nhưng hết thẻ → đặt lại
    expect(s.stats.currentStreak).toBe(1);
  });

  it("hở hai ngày trở lên thì đặt lại dù còn thẻ băng", () => {
    let s = studyDay(emptyState(), "2026-09-07T03:00:00Z");
    s = studyDay(s, "2026-09-10T03:00:00Z");
    expect(s.stats).toMatchObject({ currentStreak: 1, streakFreezes: 2 });
  });

  it("thẻ băng hồi đầy vào mỗi Thứ Hai", () => {
    let s = studyDay(emptyState(), "2026-09-07T03:00:00Z"); // Thứ Hai
    s = studyDay(s, "2026-09-09T03:00:00Z"); // tiêu 1 thẻ
    expect(s.stats.streakFreezes).toBe(1);

    expect(statsOf(s, at("2026-09-13T03:00:00Z")).streakFreezes).toBe(1); // Chủ nhật: chưa hồi
    expect(statsOf(s, at("2026-09-14T03:00:00Z")).streakFreezes).toBe(2); // Thứ Hai: hồi đầy
  });

  it("ngày mới bắt đầu theo giờ máy: 00:30 giờ VN là ngày hôm sau", () => {
    let s = studyDay(emptyState(), "2026-09-07T16:30:00Z"); // 23:30 ngày 7 (VN)
    s = studyDay(s, "2026-09-07T17:30:00Z"); //            00:30 ngày 8 (VN)
    expect(s.stats.currentStreak).toBe(2);
    expect(Object.keys(s.daily)).toEqual(["2026-09-07", "2026-09-08"]);
  });

  it("statsOf phản ánh hôm nay; heatmap đủ số ngày kể cả ngày trống", () => {
    const s = studyDay(emptyState(), "2026-09-07T03:00:00Z");
    const stats = statsOf(s, at("2026-09-07T10:00:00Z"));
    expect(stats).toMatchObject({ todayXp: 100, goalMet: true, dailyGoalXp: 50, level: 2, currentStreak: 1 });
    expect(statsOf(s, at("2026-09-08T10:00:00Z"))).toMatchObject({ todayXp: 0, goalMet: false });

    const map = heatmapOf(s, 7, at("2026-09-09T10:00:00Z"));
    expect(map).toHaveLength(7);
    expect(map[0].date).toBe("2026-09-03");
    expect(map[6].date).toBe("2026-09-09");
    expect(map.find((d) => d.date === "2026-09-07")).toMatchObject({ xp: 100, reviews: 1 });
    expect(map[0].xp).toBe(0);
  });

  it("mục tiêu ngày tuỳ chỉnh được tôn trọng", () => {
    const s = emptyState();
    s.settings.dailyGoalXp = 20;
    const out = recordActivity(s, reviewDelta(20, 0), at("2026-09-07T03:00:00Z"));
    expect(out.goalMetNow).toBe(true);
  });
});
