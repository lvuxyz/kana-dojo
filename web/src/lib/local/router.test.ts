import { beforeEach, describe, expect, it } from "vitest";
import { ApiError } from "../api-error";
import type {
  GradeResultDto, KanaCharacterDto, KanaProgressDto, Page, ProgressSummaryDto, QuizAttemptDto, QuizDetailDto, QuizDto,
  QuizResultDto, ReviewQueueDto, StatsDto, UserDto, VocabularyDto, WritingResultDto, BadgeDto, HeatmapDay,
} from "../types";
import quizData from "../../data/quizzes.json";
import { handleLocal } from "./router";
import { loadState, mutate, resetState } from "./store";

const VN = "Asia/Ho_Chi_Minh";
/** 10:00 giờ VN, thứ Tư 2026-09-30. */
const NOW = new Date("2026-09-30T03:00:00Z");
const at = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

const get = <T,>(path: string, now = NOW) => handleLocal("GET", path, undefined, now) as Promise<T>;
const post = <T,>(path: string, body?: unknown, now = NOW) => handleLocal("POST", path, body, now) as Promise<T>;
const patch = <T,>(path: string, body?: unknown) => handleLocal("PATCH", path, body, NOW) as Promise<T>;

const failure = async (p: Promise<unknown>) => {
  try { await p; } catch (e) { return e as ApiError; }
  throw new Error("lẽ ra phải ném lỗi");
};

/** Kết quả chấm của một lượt viết: `scores` đủ để qua ngưỡng, `errors` khác rỗng thì coi như có nét hỏng. */
const writing = (kanaCharacterId: number, avgScore: number, strokeErrors: { index: number; reason: string }[] = []) => ({
  kanaCharacterId, mode: "TEST", strokeScores: [avgScore, avgScore, avgScore], strokeErrors, avgScore, durationMs: 8000,
});

beforeEach(async () => {
  resetState();
  await patch<UserDto>("/auth/me", { timezone: VN });
});

describe("hồ sơ", () => {
  it("tạo hồ sơ mặc định, kiểm tra như UpdateProfileRequest, và không có tài khoản", async () => {
    const me = await get<UserDto>("/auth/me");
    expect(me).toMatchObject({ id: 1, role: "USER", dailyGoalXp: 50, locale: "vi", timezone: VN });

    const updated = await patch<UserDto>("/auth/me", { displayName: "  Lan  ", dailyGoalXp: 120 });
    expect(updated.displayName).toBe("Lan");
    expect(updated.dailyGoalXp).toBe(120);

    expect((await failure(patch("/auth/me", { dailyGoalXp: 9 }))).status).toBe(400);
    expect((await failure(patch("/auth/me", { dailyGoalXp: 5001 }))).status).toBe(400);
    const badZone = await failure(patch("/auth/me", { timezone: "Mars/Olympus" }));
    expect(badZone.status).toBe(400);
    expect(badZone.fieldErrors.timezone).toBeTruthy();
  });

  it("đường dẫn cần máy chủ trả 404 dạng Problem Details", async () => {
    for (const path of ["/leaderboard/weekly", "/me/entitlements"]) {
      const err = await failure(get(path));
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(404);
      expect(err.problem.title).toBeTruthy();
    }
  });
});

describe("kana và tiến độ", () => {
  it("danh mục 208 ký tự, lọc theo bảng chữ và nhóm, id theo thứ tự file", async () => {
    const all = await get<KanaCharacterDto[]>("/kana");
    expect(all).toHaveLength(208);
    expect(all[0]).toMatchObject({ id: 1, character: "あ", romaji: "a", script: "HIRAGANA", group: "BASIC", displayOrder: 0 });

    const hira = await get<KanaCharacterDto[]>("/kana?script=hiragana"); // không phân biệt hoa thường
    expect(hira).toHaveLength(104);
    expect(hira.every((k) => k.script === "HIRAGANA")).toBe(true);
    expect(await get<KanaCharacterDto[]>("/kana?script=KATAKANA&group=YOON")).toHaveLength(33);
    expect(await get<KanaCharacterDto[]>("/kana?script=")).toHaveLength(208); // chuỗi rỗng = không lọc
  });

  it("tiến độ: mỗi ký tự một ô, level 0 cho tới khi được viết", async () => {
    const before = await get<KanaProgressDto[]>("/progress/kana?script=HIRAGANA");
    expect(before).toHaveLength(104);
    expect(before.every((p) => p.level === 0 && p.state === "NEW" && p.dueAt === null)).toBe(true);

    await post("/writing/attempts", writing(1, 90));
    const after = await get<KanaProgressDto[]>("/progress/kana?script=HIRAGANA");
    expect(after[0]).toMatchObject({ characterId: 1, character: "あ", bestScore: 90 });
    expect(after[0].level).toBeGreaterThan(0);
    expect(after[1].level).toBe(0);
  });
});

describe("ghi bài viết (POST /writing/attempts)", () => {
  it("lần đạt đầu +25 XP và huy hiệu, lần sau chỉ XP ôn thường", async () => {
    const first = await post<WritingResultDto>("/writing/attempts", writing(1, 90));
    expect(first).toMatchObject({ passed: true, grade: 4, avgScore: 90 });
    expect(first.xpEarned).toBe(25);
    expect(first.newBadges).toEqual(["FIRST_STROKE"]);
    expect(first.card?.state).toBe("REVIEW"); // Easy tốt nghiệp ngay

    const second = await post<WritingResultDto>("/writing/attempts", writing(1, 90), at(5));
    expect(second.passed).toBe(true);
    expect(second.xpEarned).toBe(10);
    expect(second.newBadges).toEqual([]);

    // 35 XP: chưa chạm mục tiêu ngày (50) nên chưa có thưởng và chưa tính streak.
    expect(await get<StatsDto>("/stats/me")).toMatchObject({ xpTotal: 35, goalMet: false, currentStreak: 0 });
  });

  it("có nét hỏng thì grade 1, không đạt và thẻ ở bước học", async () => {
    const result = await post<WritingResultDto>("/writing/attempts", writing(2, 95, [{ index: 0, reason: "REVERSED" }]));
    expect(result).toMatchObject({ passed: false, grade: 1, xpEarned: 3 });
    expect(result.card?.state).toBe("LEARNING");
    expect(result.newBadges).toEqual([]);
  });

  it("điểm thấp: 48–69 là Hard, dưới 48 là Again", async () => {
    expect((await post<WritingResultDto>("/writing/attempts", writing(3, 60))).grade).toBe(2);
    expect((await post<WritingResultDto>("/writing/attempts", writing(4, 30))).grade).toBe(1);
  });

  it("ký tự không tồn tại → 404 và không để lại dữ liệu", async () => {
    const before = JSON.stringify(loadState());
    const err = await failure(post("/writing/attempts", writing(9999, 90)));
    expect(err.status).toBe(404);
    expect(JSON.stringify(loadState())).toBe(before);
  });

  it("dữ liệu sai định dạng bị chặn", async () => {
    const bad = [
      { ...writing(1, 90), avgScore: 101 },
      { ...writing(1, 90), strokeScores: [] },
      { ...writing(1, 90), mode: "NOPE" },
      { ...writing(1, 90), strokeScores: [50, 120] },
      { mode: "TEST", strokeScores: [50], avgScore: 50 },
    ];
    for (const body of bad) expect((await failure(post("/writing/attempts", body))).status).toBe(400);
  });

  it("durationMs âm bị chặn và không ghi gì", async () => {
    const before = JSON.stringify(loadState());
    expect((await failure(post("/writing/attempts", { ...writing(1, 90), durationMs: -1 }))).status).toBe(400);
    expect(JSON.stringify(loadState())).toBe(before);
  });
});

describe("hàng đợi ôn tập", () => {
  it("dạng {content, dueCount, newCount}; thẻ kana có character/romaji; tối đa 10 thẻ mới/ngày", async () => {
    const q = await get<ReviewQueueDto>("/reviews/queue?limit=50");
    expect(q.dueCount).toBe(0);
    expect(q.newCount).toBe(10);
    expect(q.content).toHaveLength(10);
    expect(q.content[0]).toMatchObject({ itemType: "KANA_WRITING", itemId: 1, state: "NEW", character: "あ", romaji: "a" });

    // Gọi lại không sinh thêm thẻ.
    const again = await get<ReviewQueueDto>("/reviews/queue?limit=50");
    expect(again.newCount).toBe(10);
    expect(Object.keys(loadState().cards)).toHaveLength(10);
  });

  it("chấm thẻ không làm rò hạn mức thẻ mới trong ngày", async () => {
    const q = await get<ReviewQueueDto>("/reviews/queue?limit=50");
    const card = q.content[0];

    // Chấm Good hai lần (hai bước học 1 phút → 10 phút): thẻ vẫn chỉ được tính là MỘT thẻ mới của hôm nay.
    await post("/reviews/grade", { cardId: card.cardId, grade: 3, durationMs: 1000 }, at(0));
    await post("/reviews/grade", { cardId: card.cardId, grade: 3, durationMs: 1000 }, at(2));

    const next = await get<ReviewQueueDto>("/reviews/queue?limit=50", at(30));
    // 1 thẻ đã giới thiệu → còn 9 suất; thẻ vừa học đã tốt nghiệp nên đến hạn sau nhiều ngày, không nằm trong hàng đợi.
    expect(next.newCount).toBe(9);
    expect(Object.values(loadState().cards).filter((c) => c.state === "NEW")).toHaveLength(9);
  });

  it("sang ngày mới thì có lại 10 suất thẻ mới", async () => {
    const q = await get<ReviewQueueDto>("/reviews/queue?limit=50");
    for (const c of q.content) await post("/reviews/grade", { cardId: c.cardId, grade: 4 }, at(1));

    const sameDay = await get<ReviewQueueDto>("/reviews/queue?limit=50", at(60));
    expect(sameDay.newCount).toBe(0);

    const tomorrow = await get<ReviewQueueDto>("/reviews/queue?limit=50", at(24 * 60));
    expect(tomorrow.newCount).toBe(10);
  });

  it("lọc theo loại thẻ; từ vựng trả word/meaningVi từ dữ liệu seed", async () => {
    const q = await get<ReviewQueueDto>("/reviews/queue?types=VOCAB_MEANING&limit=5");
    expect(q.content).toHaveLength(5);
    expect(q.content[0]).toMatchObject({ itemType: "VOCAB_MEANING", word: "私", reading: "わたし", meaningVi: "tôi" });
    expect(q.content[0].character).toBeNull();
  });

  it("types nhận nhiều giá trị (phân cách bằng dấu phẩy hoặc lặp tham số); giá trị lạ → 400", async () => {
    const csv = await get<ReviewQueueDto>("/reviews/queue?types=KANA_READING,VOCAB_MEANING&limit=3");
    // Thẻ mới được cấp theo thứ tự loại: KANA_READING trước VOCAB_MEANING.
    expect(csv.content.map((c) => c.itemType)).toEqual(["KANA_READING", "KANA_READING", "KANA_READING"]);

    resetState();
    const repeated = await get<ReviewQueueDto>("/reviews/queue?types=VOCAB_READING&types=VOCAB_MEANING&limit=2");
    expect(repeated.content).toHaveLength(2);
    expect(repeated.content.every((c) => c.itemType === "VOCAB_MEANING")).toBe(true);

    expect((await failure(get("/reviews/queue?types=BOGUS"))).status).toBe(400);
  });

  it("chấm Good cho thẻ mới: sang bước học kế, +10 XP, thẻ đến hạn trong 10 phút", async () => {
    const [card] = (await get<ReviewQueueDto>("/reviews/queue?limit=1")).content;
    const result = await post<GradeResultDto>("/reviews/grade", { cardId: card.cardId, grade: 3 });
    expect(result).toMatchObject({ cardId: card.cardId, state: "LEARNING", intervalDays: 0, xpEarned: 10 });
    expect(new Date(result.nextDueAt).getTime() - NOW.getTime()).toBe(10 * 60_000);

    // Chưa đến hạn thì chưa nằm trong phần "đến hạn" của hàng đợi; sau 10 phút thì có.
    expect((await get<ReviewQueueDto>("/reviews/queue?limit=50", at(5))).dueCount).toBe(0);
    const later = await get<ReviewQueueDto>("/reviews/queue?limit=50", at(11));
    expect(later.dueCount).toBe(1);
    expect(later.content[0].cardId).toBe(card.cardId);
  });

  it("thẻ không tồn tại → 404, grade ngoài 1..4 → 400", async () => {
    expect((await failure(post("/reviews/grade", { cardId: 12345, grade: 3 }))).status).toBe(404);
    expect((await failure(post("/reviews/grade", { cardId: 1, grade: 5 }))).status).toBe(400);
    expect((await failure(post("/reviews/grade", { grade: 3 }))).status).toBe(400);
  });

  it("tổng hợp tiến độ phản ánh thẻ đã học và đến hạn", async () => {
    const empty = await get<ProgressSummaryDto>("/progress/summary");
    expect(empty).toEqual({ kanaLearned: 0, kanaMastered: 0, vocabLearned: 0, dueToday: 0, newAvailable: 0 });

    await post("/writing/attempts", writing(1, 40)); // Again → ở bước học, đến hạn sau 1 phút
    const sum = await get<ProgressSummaryDto>("/progress/summary", at(2));
    expect(sum.kanaLearned).toBe(1);
    expect(sum.dueToday).toBe(1);
  });
});

describe("thống kê", () => {
  it("stats, heatmap và huy hiệu theo hoạt động trong ngày", async () => {
    expect(await get<StatsDto>("/stats/me")).toMatchObject({ xpTotal: 0, level: 1, currentStreak: 0, todayXp: 0, dailyGoalXp: 50, goalMet: false });

    await post("/writing/attempts", writing(1, 95)); // +25
    await post("/writing/attempts", writing(2, 95)); // +25 → 50: đạt mục tiêu, +50 thưởng
    const stats = await get<StatsDto>("/stats/me");
    expect(stats).toMatchObject({ xpTotal: 100, level: 2, currentStreak: 1, longestStreak: 1, todayXp: 100, goalMet: true });
    expect(stats.xpToNextLevel).toBe(300);

    const heat = await get<HeatmapDay[]>("/stats/heatmap?days=7");
    expect(heat).toEqual([{ date: "2026-09-30", xp: 100, reviews: 2 }]);

    const badges = await get<BadgeDto[]>("/badges");
    expect(badges).toHaveLength(9);
    expect(badges.find((b) => b.code === "FIRST_STROKE")?.earnedAt).toBeTruthy();
    expect(badges.find((b) => b.code === "STREAK_7")?.earnedAt).toBeNull();
  });
});

describe("từ vựng", () => {
  it("80 từ, lọc theo cấp, tìm không phân biệt hoa thường, phân trang", async () => {
    const all = await get<Page<VocabularyDto>>("/vocabulary?size=200");
    expect(all.totalElements).toBe(80);
    expect((await get<Page<VocabularyDto>>("/vocabulary?level=5&size=200")).totalElements).toBe(70);
    expect((await get<Page<VocabularyDto>>("/vocabulary?level=4&size=200")).totalElements).toBe(10);
    expect((await get<Page<VocabularyDto>>("/vocabulary?level=1")).totalElements).toBe(0);

    const search = await get<Page<VocabularyDto>>("/vocabulary?q=NIHONGO");
    expect(search.content.map((v) => v.word)).toContain("日本語");
    expect((await get<Page<VocabularyDto>>("/vocabulary?q=tiếng nhật")).totalElements).toBeGreaterThan(0);

    const page2 = await get<Page<VocabularyDto>>("/vocabulary?size=30&page=2");
    expect(page2).toMatchObject({ page: 2, size: 30, totalPages: 3 });
    expect(page2.content).toHaveLength(20);
  });
});

describe("quiz", () => {
  const answersFor = (quizId: number, wrong = 0) => {
    const quiz = quizData.find((q) => q.id === quizId)!;
    return quiz.questions.map((q, i) => ({ questionId: q.id, givenAnswer: i < wrong ? "sai-chắc-chắn" : q.correctAnswer }));
  };

  it("danh sách 4 bài; đề không lộ đáp án", async () => {
    const list = await get<Page<QuizDto>>("/quizzes?size=50");
    expect(list.totalElements).toBe(4);
    expect(list.content.map((q) => q.questionCount)).toEqual([10, 10, 10, 8]);

    const detail = await get<QuizDetailDto>("/quizzes/1");
    expect(detail.questions).toHaveLength(10);
    expect(JSON.stringify(detail)).not.toContain("correctAnswer");
    expect(JSON.stringify(detail)).not.toContain("explanationVi");
    expect((await failure(get("/quizzes/99"))).status).toBe(404);
  });

  it("trả lời đúng hết được 100 điểm; so khớp bỏ khoảng trắng và hoa thường", async () => {
    const attempt = await post<QuizAttemptDto>("/quizzes/4/attempts");
    expect(attempt.totalCount).toBe(8);

    const answers = answersFor(4).map((a, i) => (i === 0 ? { ...a, givenAnswer: `  ${a.givenAnswer!.toUpperCase()} ` } : a));
    const result = await post<QuizResultDto>(`/quiz-attempts/${attempt.attemptId}/submit`, { answers }, at(2));
    expect(result).toMatchObject({ score: 100, correctCount: 8, totalCount: 8 });
    expect(result.xpEarned).toBe(20 + 8 * 5 + 50); // + thưởng đạt mục tiêu ngày lần đầu
    expect(result.answers.every((a) => a.correct)).toBe(true);
    expect(result.answers[0].explanationVi).toBeTruthy();
  });

  it("câu không gửi tính là sai: điểm tính trên tổng số câu của đề", async () => {
    const attempt = await post<QuizAttemptDto>("/quizzes/1/attempts");
    const half = answersFor(1).slice(0, 5);
    const result = await post<QuizResultDto>(`/quiz-attempts/${attempt.attemptId}/submit`, { answers: half });
    expect(result).toMatchObject({ score: 50, correctCount: 5, totalCount: 10 });
  });

  it("câu sai không được điểm và để lại đáp án đúng; câu lạ đề bị bỏ qua", async () => {
    const attempt = await post<QuizAttemptDto>("/quizzes/3/attempts");
    const answers = [...answersFor(3, 3), { questionId: 99999, givenAnswer: "x" }];
    const result = await post<QuizResultDto>(`/quiz-attempts/${attempt.attemptId}/submit`, { answers });
    expect(result.correctCount).toBe(7);
    expect(result.answers).toHaveLength(10);
    const wrong = result.answers.find((a) => !a.correct)!;
    expect(wrong.correctAnswer).toBeTruthy();
  });

  it("mỗi lượt chỉ nộp được một lần; lượt không tồn tại → 404; danh sách rỗng → 400", async () => {
    const attempt = await post<QuizAttemptDto>("/quizzes/2/attempts");
    await post(`/quiz-attempts/${attempt.attemptId}/submit`, { answers: answersFor(2) });
    expect((await failure(post(`/quiz-attempts/${attempt.attemptId}/submit`, { answers: answersFor(2) }))).status).toBe(400);
    expect((await failure(post("/quiz-attempts/777/submit", { answers: answersFor(2) }))).status).toBe(404);

    const another = await post<QuizAttemptDto>("/quizzes/2/attempts");
    expect((await failure(post(`/quiz-attempts/${another.attemptId}/submit`, { answers: [] }))).status).toBe(400);
  });
});

describe("lưu trữ", () => {
  it("mutate không ghi gì nếu hàm ném lỗi giữa chừng (như giao dịch)", () => {
    const before = JSON.stringify(loadState());
    expect(() => mutate((s) => { s.stats.xpTotal = 999; throw new Error("boom"); })).toThrow("boom");
    expect(JSON.stringify(loadState())).toBe(before);
  });

  it("dữ liệu bền qua các lần đọc và xoá sạch được", async () => {
    await post("/writing/attempts", writing(1, 90));
    expect(loadState().writing.best["1"]).toBe(90);
    expect((await get<StatsDto>("/stats/me")).xpTotal).toBeGreaterThan(0);

    resetState();
    expect((await get<StatsDto>("/stats/me")).xpTotal).toBe(0);
  });
});
