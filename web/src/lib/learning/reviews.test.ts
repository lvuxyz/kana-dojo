import { describe, expect, it } from "vitest";
import { VOCABULARY } from "@/data/vocabulary";
import { KANA, charsOf } from "../kana";
import { badgeStatuses } from "./badges";
import { cardKey } from "./cards";
import {
  NEW_CARDS_PER_DAY, buildQueue, gradeCard, kanaProgress, recordWriting, summaryOf, type Outcome,
} from "./reviews";
import { emptyState, type ProgressState } from "./state";
import type { Clock } from "./time";

const VN = "Asia/Ho_Chi_Minh";
const at = (iso: string): Clock => ({ now: Date.parse(iso), zone: VN });
const MON = at("2026-09-07T03:00:00Z"); // 10:00 Thứ Hai, giờ VN

const attempt = (character: string, avgScore: number, strokeErrors: unknown[] = []) =>
  ({ character, avgScore, strokeErrors, durationMs: 4000 });

describe("hàng đợi ôn tập", () => {
  it("người mới: toàn thẻ KANA_WRITING chưa học, đúng thứ tự dạy học", () => {
    const q = buildQueue(emptyState(), { limit: 5 }, MON);

    expect(q.dueCount).toBe(0);
    expect(q.newCount).toBe(5);
    expect(q.content.map((c) => c.character)).toEqual(["あ", "い", "う", "え", "お"]);
    expect(q.content[0]).toMatchObject({
      itemType: "KANA_WRITING", state: "NEW", romaji: "a", cardKey: "KANA_WRITING:あ", word: null,
    });
  });

  it("lọc theo loại thẻ từ vựng trả word/meaningVi từ nội dung đóng gói", () => {
    const q = buildQueue(emptyState(), { limit: 3, types: ["VOCAB_MEANING"] }, MON);

    expect(q.content).toHaveLength(3);
    expect(q.content[0]).toMatchObject({
      itemType: "VOCAB_MEANING", itemId: "1", word: VOCABULARY[0].word, meaningVi: VOCABULARY[0].meaningVi, character: null,
    });
  });

  it(`không vượt hạn mức ${NEW_CARDS_PER_DAY} thẻ mới mỗi ngày`, () => {
    let s = emptyState();
    const first = buildQueue(s, { limit: 50 }, MON);
    expect(first.newCount).toBe(NEW_CARDS_PER_DAY);

    // Học hết số thẻ mới được phép của hôm nay
    for (const item of first.content) s = gradeCard(s, item.cardKey, 3, 0, MON).state;
    expect(Object.keys(s.cards)).toHaveLength(NEW_CARDS_PER_DAY);

    // Cùng ngày: không cấp thêm thẻ mới (thẻ vừa học còn đang trong bước học, chưa đến hạn)
    const again = buildQueue(s, { limit: 50 }, at("2026-09-07T03:00:30Z"));
    expect(again.newCount).toBe(0);
    expect(again.dueCount).toBe(0);

    // Sang ngày mới: hạn mức đặt lại
    const next = buildQueue(s, { limit: 50 }, at("2026-09-08T03:00:00Z"));
    expect(next.newCount).toBe(NEW_CARDS_PER_DAY);
    expect(next.dueCount).toBe(NEW_CARDS_PER_DAY); // và 10 thẻ hôm qua đã đến hạn
    expect(next.content[0].state).toBe("LEARNING"); // thẻ đến hạn xếp trước thẻ mới
  });

  it("ôn lại một thẻ vừa học trong ngày KHÔNG làm hạn mức thẻ mới hồi lại", () => {
    // Bản cũ đếm "thẻ mới hôm nay" bằng điều kiện reps = 1: ôn lần hai (reps = 2) là thẻ rời khỏi bộ đếm
    // và hạn mức rò thêm một thẻ mỗi lần ôn lại.
    let s = emptyState();
    for (const item of buildQueue(s, { limit: 50 }, MON).content) s = gradeCard(s, item.cardKey, 3, 0, MON).state;
    expect(buildQueue(s, { limit: 50 }, MON).newCount).toBe(0);

    const later = at("2026-09-07T03:11:00Z"); // 11 phút sau: bước học 10 phút đã đến hạn
    s = gradeCard(s, "KANA_WRITING:あ", 3, 0, later).state;
    s = gradeCard(s, "KANA_WRITING:い", 3, 0, later).state;
    expect(s.cards["KANA_WRITING:あ"].reps).toBe(2);

    const q = buildQueue(s, { limit: 50 }, later);
    expect(q.newCount).toBe(0);
    expect(q.content.some((c) => c.state === "NEW")).toBe(false);
  });

  it("hạn mức tính theo ngày địa phương, không phải UTC", () => {
    let s = emptyState();
    const late = at("2026-09-07T16:30:00Z"); // 23:30 ngày 7 (VN)
    for (const item of buildQueue(s, { limit: 10 }, late).content) s = gradeCard(s, item.cardKey, 3, 0, late).state;

    const afterMidnightVn = at("2026-09-07T17:30:00Z"); // 00:30 ngày 8 (VN) — vẫn là ngày 7 theo UTC
    // limit đủ rộng để chứa cả 10 thẻ vừa đến hạn lẫn 10 thẻ mới của ngày 8
    expect(buildQueue(s, { limit: 30, types: ["KANA_WRITING"] }, afterMidnightVn).newCount).toBe(NEW_CARDS_PER_DAY);
  });

  it("thẻ đến hạn xếp theo mức trễ hạn và không vượt limit", () => {
    let s = emptyState();
    s = gradeCard(s, "KANA_WRITING:あ", 4, 0, at("2026-09-01T03:00:00Z")).state;
    s = gradeCard(s, "KANA_WRITING:い", 4, 0, at("2026-08-01T03:00:00Z")).state;

    const q = buildQueue(s, { limit: 1 }, at("2026-12-31T03:00:00Z"));
    expect(q.dueCount).toBe(1);
    expect(q.content[0].character).toBe("い"); // trễ hạn nhất
  });
});

describe("thẻ mồ côi (mục nội dung không còn tồn tại)", () => {
  it("bị bỏ qua khỏi hàng đợi và bộ đếm đến hạn, không làm kẹt các thẻ còn lại", () => {
    const s = gradeCard(emptyState(), "KANA_WRITING:あ", 4, 0, at("2026-09-01T03:00:00Z")).state;
    // Giả lập tệp sao lưu từ bản nội dung cũ: từ vựng id 9999 từng tồn tại
    s.cards["VOCAB_MEANING:9999"] = { ...s.cards["KANA_WRITING:あ"], itemType: "VOCAB_MEANING", itemId: "9999" };

    const later = at("2026-12-31T03:00:00Z");
    const q = buildQueue(s, { limit: 5, types: ["KANA_WRITING", "VOCAB_MEANING"] }, later);
    expect(q.content.filter((c) => c.state !== "NEW").map((c) => c.cardKey)).toEqual(["KANA_WRITING:あ"]);
    expect(q.dueCount).toBe(1);
    expect(summaryOf(s, later).dueToday).toBe(1);
    expect(() => gradeCard(s, "VOCAB_MEANING:9999", 3, 0, later)).toThrow(/Không tìm thấy thẻ/);
  });
});

describe("chấm thẻ", () => {
  it("Good cho thẻ mới: sang bước học kế, +10 XP, hẹn lại sau 10 phút", () => {
    const s0 = emptyState();
    const { state, result } = gradeCard(s0, "KANA_WRITING:あ", 3, 1500, MON);

    expect(result).toMatchObject({ state: "LEARNING", xpEarned: 10, intervalDays: 0, cardKey: "KANA_WRITING:あ" });
    expect(result.nextDueAt).toBe(MON.now + 10 * 60_000);
    expect(state.cards["KANA_WRITING:あ"]).toMatchObject({ reps: 1, introducedDay: "2026-09-07", lastReviewedAt: MON.now });
    expect(state.stats.xpTotal).toBe(10);
    // Trạng thái cũ không bị đụng tới
    expect(s0.cards).toEqual({});
    expect(s0.stats.xpTotal).toBe(0);
  });

  it("Again được 3 XP; thẻ từ vựng cũng chấm được", () => {
    const { state, result } = gradeCard(emptyState(), "VOCAB_MEANING:5", 1, 0, MON);
    expect(result.xpEarned).toBe(3);
    expect(state.cards["VOCAB_MEANING:5"]).toMatchObject({ itemType: "VOCAB_MEANING", itemId: "5", state: "LEARNING" });
  });

  it("thẻ không tồn tại bị từ chối", () => {
    const s = emptyState();
    expect(() => gradeCard(s, "KANA_WRITING:Z", 3, 0, MON)).toThrow(/Không tìm thấy thẻ/);
    expect(() => gradeCard(s, "VOCAB_MEANING:99999", 3, 0, MON)).toThrow();
    expect(() => gradeCard(s, "rác", 3, 0, MON)).toThrow();
  });

  it("elapsedDays dùng thời gian thật giữa hai lần ôn", () => {
    const first = gradeCard(emptyState(), "KANA_WRITING:あ", 4, 0, at("2026-09-01T03:00:00Z"));
    const early = gradeCard(first.state, "KANA_WRITING:あ", 3, 0, at("2026-09-01T03:05:00Z"));
    const late = gradeCard(first.state, "KANA_WRITING:あ", 3, 0, at("2026-10-01T03:00:00Z"));

    // Ôn quá sớm (R ≈ 1) tăng stability ít hơn ôn khi đã sắp quên
    expect(late.result.stability).toBeGreaterThan(early.result.stability);
  });
});

describe("luyện viết", () => {
  it("lần viết đạt đầu tiên ghi đủ mọi thứ: điểm, thẻ FSRS, XP, huy hiệu", () => {
    const { state, result } = recordWriting(emptyState(), attempt("あ", 95), MON);

    expect(result).toMatchObject({ passed: true, grade: 4, xpEarned: 25, newBadges: ["FIRST_STROKE"] });
    expect(result.card.state).toBe("REVIEW"); // Easy tốt nghiệp thẳng lên REVIEW
    expect(state.writing).toMatchObject({ best: { あ: 95 }, passed: ["あ"], recent: [95] });
    expect(state.cards["KANA_WRITING:あ"]).toMatchObject({ state: "REVIEW", reps: 1 });
    expect(state.stats.xpTotal).toBe(25);
    expect(state.daily["2026-09-07"]).toMatchObject({ xp: 25, chars: 1, reviews: 1 });
    expect(state.badges.FIRST_STROKE).toBe(MON.now);
  });

  it("viết đạt lần nữa chỉ được XP ôn thường và không nhận lại huy hiệu", () => {
    const first = recordWriting(emptyState(), attempt("か", 95), MON).state;
    const again = recordWriting(first, attempt("か", 95), at("2026-09-07T03:30:00Z"));

    expect(again.result.xpEarned).toBe(10);
    expect(again.result.newBadges).toEqual([]);
    expect(Object.keys(again.state.cards)).toEqual(["KANA_WRITING:か"]); // vẫn một thẻ cho một ký tự
    expect(again.state.cards["KANA_WRITING:か"].reps).toBe(2);
    expect(again.state.writing.passed).toEqual(["か"]);
  });

  it("có nét hỏng thì grade 1, không đạt và thẻ quay về bước học", () => {
    const { state, result } = recordWriting(
      emptyState(), attempt("さ", 90, [{ index: 1, reason: "REVERSED" }]), MON,
    );

    expect(result).toMatchObject({ passed: false, grade: 1, xpEarned: 3, newBadges: [] });
    expect(result.card.state).toBe("LEARNING");
    expect(state.writing.passed).toEqual([]); // chưa tính là đạt
    expect(state.writing.best["さ"]).toBe(90); // nhưng điểm vẫn được ghi nhận
  });

  it("điểm cao nhất chỉ tăng, điểm gần nhất giữ tối đa 10 lần", () => {
    let s = emptyState();
    for (let i = 0; i < 12; i++) s = recordWriting(s, attempt("あ", i === 3 ? 99 : 60), MON).state;
    s = recordWriting(s, attempt("あ", 40), MON).state;

    expect(s.writing.best["あ"]).toBe(99);
    expect(s.writing.recent).toHaveLength(10);
    expect(s.writing.recent.at(-1)).toBe(40);
  });

  it("ký tự lạ bị từ chối và không để lại dấu vết; điểm ngoài khoảng được kẹp", () => {
    const s = emptyState();
    expect(() => recordWriting(s, attempt("Z", 95), MON)).toThrow(/Không tìm thấy ký tự/);
    expect(s).toEqual(emptyState());

    expect(recordWriting(s, attempt("あ", 150), MON).result.avgScore).toBe(100);
    expect(recordWriting(s, attempt("あ", -5), MON).result.avgScore).toBe(0);
  });
});

describe("huy hiệu", () => {
  const unlocked = (s: ProgressState) => badgeStatuses(s).filter((b) => b.earnedAt !== null).map((b) => b.code);

  it("Cú đêm: học sau 23 giờ theo giờ địa phương", () => {
    const day = recordWriting(emptyState(), attempt("あ", 95), at("2026-09-07T15:30:00Z")).state; // 22:30 VN
    expect(unlocked(day)).not.toContain("NIGHT_OWL");

    const night = recordWriting(emptyState(), attempt("あ", 95), at("2026-09-07T16:30:00Z")).state; // 23:30 VN
    expect(unlocked(night)).toContain("NIGHT_OWL");
  });

  it("Mười điểm tuyệt đối: 10 lần liên tiếp từ 95 điểm; một lần thấp phá chuỗi", () => {
    let s = emptyState();
    let last: Outcome<{ newBadges: string[] }> | null = null;
    for (let i = 0; i < 10; i++) {
      last = recordWriting(s, attempt(KANA.chars[i].c, 96), MON);
      s = last.state;
      if (i < 9) expect(last.result.newBadges).not.toContain("PERFECT_10");
    }
    expect(last!.result.newBadges).toContain("PERFECT_10");

    let broken = emptyState();
    for (let i = 0; i < 10; i++) broken = recordWriting(broken, attempt("あ", i === 4 ? 90 : 96), MON).state;
    expect(unlocked(broken)).not.toContain("PERFECT_10");
  });

  it("Bậc thầy Hiragana: đủ 46 chữ cơ bản đã tốt nghiệp; Katakana độc lập", () => {
    let s = emptyState();
    const basics = charsOf("h", "basic");
    expect(basics).toHaveLength(46);

    for (const c of basics.slice(0, 45)) s = recordWriting(s, attempt(c.c, 95), MON).state;
    expect(unlocked(s)).not.toContain("HIRAGANA_MASTER");

    const last = recordWriting(s, attempt(basics[45].c, 95), MON);
    expect(last.result.newBadges).toContain("HIRAGANA_MASTER");
    expect(last.result.newBadges).not.toContain("KATAKANA_MASTER");
  });

  it("Kiên trì: nhận khi streak chạm mốc, chỉ nhận một lần", () => {
    const s = emptyState();
    s.stats.currentStreak = 6;
    s.stats.lastActiveDate = "2026-09-06";
    s.settings.dailyGoalXp = 10;

    const out = recordWriting(s, attempt("あ", 95), MON); // đạt mục tiêu ngày → streak 7
    expect(out.state.stats.currentStreak).toBe(7);
    expect(out.result.newBadges).toContain("STREAK_7");

    const next = recordWriting(out.state, attempt("い", 95), MON);
    expect(next.result.newBadges).not.toContain("STREAK_7");
  });

  it("Nghìn lượt ôn", () => {
    const s = emptyState();
    s.stats.totalReviews = 999;
    expect(gradeCard(s, "KANA_WRITING:あ", 3, 0, MON).result.newBadges).toContain("REVIEW_1000");
  });
});

describe("tiến độ", () => {
  it("lưới kana: level 0 chưa học, 1 đang học, 2 đã vào lịch ôn; kèm điểm cao nhất", () => {
    let s = emptyState();
    s = recordWriting(s, attempt("あ", 95), MON).state; // → REVIEW
    s = recordWriting(s, attempt("い", 50, [{ index: 0, reason: "OFF_PATH" }]), MON).state; // → LEARNING

    const p = Object.fromEntries(kanaProgress(s, "h").map((x) => [x.character, x]));
    expect(Object.keys(p)).toHaveLength(104);
    expect(p["あ"]).toMatchObject({ level: 2, state: "REVIEW", bestScore: 95 });
    expect(p["い"]).toMatchObject({ level: 1, state: "LEARNING", bestScore: 50 });
    expect(p["う"]).toMatchObject({ level: 0, state: "NEW", dueAt: null, bestScore: 0 });
    expect(kanaProgress(s, "k").every((x) => x.level === 0)).toBe(true);
  });

  it("ô đã thuộc (level 2) giữ nguyên dù thẻ mạnh lên — không còn mốc stability làm ô mất dấu", () => {
    // Bản cũ trả mức 2..5 theo stability nhưng lưới chỉ tô màu đúng mức 2, nên thẻ vượt 7 ngày bị mất dấu 済.
    const s = recordWriting(emptyState(), attempt("あ", 95), MON).state;
    for (const stability of [1, 7, 21, 60, 400]) {
      s.cards["KANA_WRITING:あ"].stability = stability;
      const cell = kanaProgress(s, "h").find((x) => x.character === "あ")!;
      expect(cell.level, `stability ${stability}`).toBe(2);
    }
  });

  it("tổng hợp: đã học, đã thuộc chắc (stability ≥ 21 ngày), đến hạn", () => {
    let s = recordWriting(emptyState(), attempt("あ", 95), MON).state;
    s = recordWriting(s, attempt("い", 95), MON).state;
    s.cards[cardKey("KANA_WRITING", "あ")].stability = 30;

    expect(summaryOf(s, MON)).toEqual({ kanaLearned: 2, kanaMastered: 1, dueToday: 0 });

    const later = at("2027-01-01T00:00:00Z");
    expect(summaryOf(s, later).dueToday).toBe(2);
  });
});
