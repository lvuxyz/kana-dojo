import { beforeEach, describe, expect, it } from "vitest";
import { ApiError } from "../api";
import type {
  BadgeDto, GradeResultDto, HeatmapDay, KanaCharacterDto, KanaProgressDto, LeaderboardDto, Page, ProgressSummaryDto,
  QuizDetailDto, QuizDto, QuizResultDto, ReviewQueueDto, StatsDto, UserDto, VocabularyDto, WritingResultDto,
} from "../types";
import { localAuth, localLogout, localRequest } from "./index";
import { setClock, setStorage, type KV } from "./db";
import { KANA_CATALOG, QUIZZES } from "./content";

// Một khoảnh khắc 12:00 trưa giờ VN, thứ Hai 2026-09-07 — đầu tuần nên thẻ băng đầy và không vắt qua thứ Hai kế tiếp.
const T0 = Date.parse("2026-09-07T05:00:00Z");
const DAY = 86_400_000;

let now = T0;
beforeEach(() => {
  const mem = new Map<string, string>();
  const kv: KV = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => { mem.set(k, v); } };
  setStorage(kv);
  now = T0;
  setClock(() => now);
});

const get = <T,>(p: string) => localRequest<T>(p, "GET");
const post = <T,>(p: string, body?: unknown) => localRequest<T>(p, "POST", body);
const patch = <T,>(p: string, body?: unknown) => localRequest<T>(p, "PATCH", body);

async function problem(p: Promise<unknown>) {
  try { await p; } catch (e) {
    expect(e).toBeInstanceOf(ApiError);
    return (e as ApiError).problem;
  }
  throw new Error("Đáng lẽ phải ném ApiError");
}

let n = 0;
async function signUp(over: Partial<{ username: string; displayName: string }> = {}) {
  n++;
  return localAuth("register", {
    email: `u${n}@example.test`, username: over.username ?? `user${n}`, password: "matkhau-123", displayName: over.displayName ?? `Người ${n}`,
  });
}

const attempt = (kanaCharacterId: number, score: number, strokeErrors: { index: number; reason: string }[] = []) =>
  post<WritingResultDto>("/writing/attempts", {
    kanaCharacterId, mode: "TEST", strokeScores: [score], strokeErrors, avgScore: score, durationMs: 1000,
  });

const basicHiragana = KANA_CATALOG.filter((k) => k.script === "HIRAGANA" && k.group === "BASIC");

describe("xác thực cục bộ", () => {
  it("đăng ký tạo tài khoản, đăng nhập sẵn và trả đúng DTO", async () => {
    const r = await signUp({ username: "hoa", displayName: "  Hoa  " });
    expect(r.user).toMatchObject({ username: "hoa", displayName: "Hoa", plan: "FREE", role: "USER", locale: "vi", dailyGoalXp: 50, timezone: "Asia/Ho_Chi_Minh" });
    expect(r.accessToken).toBeTruthy();
    expect((await localAuth("refresh")).user.id).toBe(r.user.id); // phiên còn sau "tải lại trang"
    expect(await get<UserDto>("/auth/me")).toMatchObject({ username: "hoa" });
  });

  it("kiểm tra dữ liệu đăng ký với đúng thông báo của backend", async () => {
    const p = await problem(localAuth("register", { email: "khong-hop-le", username: "a!", password: "123", displayName: "" }));
    expect(p).toMatchObject({ status: 400, title: "Dữ liệu không hợp lệ", type: "https://kanadojo.app/errors/validation" });
    expect(p.errors).toEqual({
      email: "Email không đúng định dạng",
      username: "Tên đăng nhập phải từ 3 đến 32 ký tự",
      password: "Mật khẩu phải có ít nhất 8 ký tự",
      displayName: "Tên hiển thị không được để trống",
    });
    expect(p.detail).toBe("Email không đúng định dạng");
  });

  it("email và tên đăng nhập trùng bị 409, không phân biệt hoa thường ở email", async () => {
    await localAuth("register", { email: "A@Example.test", username: "abc", password: "matkhau-123", displayName: "A" });
    const dupEmail = await problem(localAuth("register", { email: "a@example.TEST", username: "xyz", password: "matkhau-123", displayName: "B" }));
    expect(dupEmail).toMatchObject({ status: 409, detail: "Email đã được sử dụng", errors: { email: "Email đã được sử dụng" } });
    const dupUser = await problem(localAuth("register", { email: "b@example.test", username: "abc", password: "matkhau-123", displayName: "B" }));
    expect(dupUser).toMatchObject({ status: 409, detail: "Tên đăng nhập đã được sử dụng" });
  });

  it("đăng nhập bằng email hoặc username, sai mật khẩu cùng một thông báo, đăng xuất xoá phiên", async () => {
    await localAuth("register", { email: "x@example.test", username: "xuser", password: "matkhau-123", displayName: "X" });
    localLogout();
    expect((await problem(localAuth("refresh"))).status).toBe(401);
    expect((await problem(get("/stats/me"))).status).toBe(401);

    const bad = await problem(localAuth("login", { emailOrUsername: "xuser", password: "sai-mat-khau" }));
    const ghost = await problem(localAuth("login", { emailOrUsername: "khong-ton-tai", password: "matkhau-123" }));
    expect(bad.detail).toBe("Email/tên đăng nhập hoặc mật khẩu không đúng");
    expect(ghost.detail).toBe(bad.detail);

    expect((await localAuth("login", { emailOrUsername: "XUSER".toLowerCase(), password: "matkhau-123" })).user.username).toBe("xuser");
    localLogout();
    expect((await localAuth("login", { emailOrUsername: "X@EXAMPLE.test", password: "matkhau-123" })).user.username).toBe("xuser");
  });

  it("mật khẩu không nằm ở dạng thô trong kho", async () => {
    await signUp();
    const raw = JSON.stringify(await (async () => { const { load } = await import("./db"); return load(); })());
    expect(raw).not.toContain("matkhau-123");
  });

  it("Google tạm tắt ở chế độ độc lập", async () => {
    await expect(localAuth("google", { idToken: "x" })).rejects.toThrow(/Google/);
  });

  it("cập nhật hồ sơ kiểm tra khoảng giá trị và múi giờ", async () => {
    await signUp();
    expect((await problem(patch("/auth/me", { dailyGoalXp: 5 }))).errors).toEqual({ dailyGoalXp: "Mục tiêu ngày tối thiểu là 10 XP" });
    expect((await problem(patch("/auth/me", { dailyGoalXp: 6000 }))).detail).toBe("Mục tiêu ngày tối đa là 5000 XP");
    expect((await problem(patch("/auth/me", { timezone: "Mars/Olympus" }))).detail).toBe("Múi giờ không hợp lệ");
    const ok = await patch<UserDto>("/auth/me", { displayName: "Tên mới", dailyGoalXp: 100, timezone: "Asia/Tokyo" });
    expect(ok).toMatchObject({ displayName: "Tên mới", dailyGoalXp: 100, timezone: "Asia/Tokyo" });
    expect((await get<UserDto>("/auth/me")).dailyGoalXp).toBe(100);
  });
});

describe("danh mục kana", () => {
  it("có 208 ký tự, id ổn định theo thứ tự seed, lọc theo bảng chữ và nhóm", async () => {
    expect(KANA_CATALOG).toHaveLength(208);
    expect(KANA_CATALOG[0]).toMatchObject({ id: 1, character: "あ", romaji: "a", script: "HIRAGANA", group: "BASIC", displayOrder: 0 });
    const hira = await get<KanaCharacterDto[]>("/kana?script=HIRAGANA");
    const yoon = await get<KanaCharacterDto[]>("/kana?script=KATAKANA&group=YOON");
    expect(hira).toHaveLength(104);
    expect(yoon).toHaveLength(33);
    expect(basicHiragana).toHaveLength(46);
    expect((await problem(get("/kana?script=KANJI"))).status).toBe(400);
  });
});

describe("luyện viết, XP và streak", () => {
  it("lần đạt đầu thưởng 25 XP, các lần sau 10 XP, đạt mục tiêu ngày thì +50", async () => {
    await signUp();
    const a = await attempt(1, 90);
    expect(a).toMatchObject({ passed: true, grade: 4, avgScore: 90, xpEarned: 25, newBadges: ["FIRST_STROKE"] });
    expect(a.card).toMatchObject({ state: "REVIEW", xpEarned: 25 });
    expect(a.card!.intervalDays).toBeGreaterThanOrEqual(1);

    expect((await attempt(1, 90)).xpEarned).toBe(10); // đã đạt rồi → như một lượt ôn thường
    expect((await attempt(1, 90)).xpEarned).toBe(10);
    const goal = await attempt(1, 90); // 25+10+10+10 = 55 ≥ 50 → +50
    expect(goal.xpEarned).toBe(60);

    expect(await get<StatsDto>("/stats/me")).toMatchObject({
      xpTotal: 105, level: 2, xpToNextLevel: 400 - 105, currentStreak: 1, longestStreak: 1, todayXp: 105, dailyGoalXp: 50, goalMet: true, streakFreezes: 2,
    });
  });

  it("bài viết kém hoặc có nét hỏng bị chấm Again và chỉ được 3 XP", async () => {
    await signUp();
    const low = await attempt(2, 30);
    expect(low).toMatchObject({ passed: false, grade: 1, xpEarned: 3 });
    expect(low.card!.state).toBe("LEARNING");

    const failedStroke = await attempt(3, 100, [{ index: 0, reason: "REVERSED" }]);
    expect(failedStroke).toMatchObject({ passed: false, grade: 1 }); // một nét hỏng là đủ, bất kể điểm trung bình
    const hard = await attempt(4, 60);
    expect(hard).toMatchObject({ passed: false, grade: 2, xpEarned: 10 });
  });

  it("kiểm tra dữ liệu bài viết và ký tự không tồn tại", async () => {
    await signUp();
    const p = await problem(post("/writing/attempts", { mode: "TEST", strokeScores: [], avgScore: 120 }));
    expect(p.status).toBe(400);
    expect(Object.keys(p.errors!).sort()).toEqual(["avgScore", "kanaCharacterId", "strokeScores"]);
    expect((await problem(attempt(9999, 80))).detail).toBe("Không tìm thấy ký tự kana cần luyện viết");
  });

  it("tiến độ lưới chữ: level 0/1/2 theo frontend, bestScore null khi chưa viết", async () => {
    await signUp();
    await attempt(1, 95);
    await attempt(1, 40);
    await attempt(2, 30);
    const progress = await get<KanaProgressDto[]>("/progress/kana?script=HIRAGANA");
    expect(progress).toHaveLength(104);
    const [a, i, u] = progress;
    expect(a).toMatchObject({ character: "あ", bestScore: 95 });
    expect(a.level).toBe(1); // vừa bị Again nên về RELEARNING — chưa thuộc chắc
    expect(i).toMatchObject({ character: "い", bestScore: 30, state: "LEARNING", level: 1 });
    expect(u).toMatchObject({ character: "う", bestScore: null, state: "NEW", level: 0, dueAt: null });
    expect(new Set(progress.map((p) => p.level))).toEqual(new Set([0, 1]));

    const s = await get<ProgressSummaryDto>("/progress/summary");
    expect(s).toMatchObject({ kanaLearned: 2, kanaMastered: 0, vocabLearned: 0 });
  });

  it("streak: +1 mỗi ngày đạt mục tiêu, dùng thẻ băng khi hở đúng một ngày, hở nhiều hơn thì về 1", async () => {
    await signUp();
    await patch("/auth/me", { dailyGoalXp: 10 });

    await attempt(1, 90); // 25 ≥ 10 → +50, streak 1
    expect((await get<StatsDto>("/stats/me")).currentStreak).toBe(1);
    await attempt(1, 90); // cùng ngày: không cộng thêm
    expect((await get<StatsDto>("/stats/me")).currentStreak).toBe(1);

    now = T0 + DAY; // 09-08
    await attempt(1, 90);
    expect(await get<StatsDto>("/stats/me")).toMatchObject({ currentStreak: 2, streakFreezes: 2 });

    now = T0 + 3 * DAY; // 09-10: bỏ lỡ 09-09 → tiêu một thẻ băng
    await attempt(1, 90);
    expect(await get<StatsDto>("/stats/me")).toMatchObject({ currentStreak: 3, longestStreak: 3, streakFreezes: 1 });

    now = T0 + 6 * DAY; // 09-13: bỏ lỡ 2 ngày → thẻ băng không cứu được
    await attempt(1, 90);
    expect(await get<StatsDto>("/stats/me")).toMatchObject({ currentStreak: 1, longestStreak: 3, streakFreezes: 1 });

    now = T0 + 7 * DAY; // thứ Hai 09-14: thẻ băng hồi đầy
    expect((await get<StatsDto>("/stats/me")).streakFreezes).toBe(2);
  });

  it("ngày tính theo múi giờ của người học: 23:30 giờ VN vẫn là ngày hôm đó, 00:30 là ngày mới", async () => {
    await signUp();
    await patch("/auth/me", { dailyGoalXp: 10 });
    now = Date.parse("2026-09-07T16:30:00Z"); // 23:30 VN ngày 07
    await attempt(1, 90);
    now = Date.parse("2026-09-07T17:30:00Z"); // 00:30 VN ngày 08 — vẫn là 17:30 UTC cùng ngày 07
    await attempt(1, 90);
    expect((await get<StatsDto>("/stats/me")).currentStreak).toBe(2);
    const heat = await get<HeatmapDay[]>("/stats/heatmap?days=7");
    expect(heat.map((h) => h.date)).toEqual(["2026-09-07", "2026-09-08"]);
  });

  it("vượt hạn mức 100 lượt viết/ngày của gói FREE bị 429, sang ngày mới thì được lại", async () => {
    await signUp();
    for (let i = 0; i < 100; i++) await attempt(1, 90);
    const p = await problem(attempt(1, 90));
    expect(p).toMatchObject({ status: 429, title: "Vượt hạn mức gói cước", featureKey: "writing.daily_attempts", limitValue: 100 });
    expect(p.detail).toContain("100 lượt luyện viết");
    expect(p.type).toBe("https://kanadojo.app/errors/quota-exceeded");

    const ent = await get<{ plan: string; features: Record<string, number | null>; usage: Record<string, number> }>("/me/entitlements");
    expect(ent.usage["writing.daily_attempts"]).toBe(100);
    expect(ent.features["srs.daily_reviews"]).toBe(60);

    now = T0 + DAY;
    expect((await attempt(1, 90)).passed).toBe(true);
  });

  it("heatmap bị cắt còn 30 ngày với gói FREE", async () => {
    await signUp();
    for (let d = 0; d < 40; d++) { now = T0 + d * DAY; await attempt(1, 90); }
    const heat = await get<HeatmapDay[]>("/stats/heatmap?days=112");
    expect(heat).toHaveLength(30);
    expect(heat.at(-1)!.date).toBe("2026-10-16");
  });
});

describe("huy hiệu", () => {
  it("FIRST_STROKE, PERFECT_10 và HIRAGANA_MASTER được trao đúng lúc, mỗi huy hiệu chỉ một lần", async () => {
    await signUp();
    const seen = new Map<string, number>();
    for (const [i, k] of basicHiragana.entries()) {
      const r = await attempt(k.id, 96); // ≥ 88 → Easy → tốt nghiệp thẳng sang REVIEW
      for (const b of r.newBadges) seen.set(b, i + 1);
    }
    expect(Object.fromEntries(seen)).toEqual({ FIRST_STROKE: 1, PERFECT_10: 10, HIRAGANA_MASTER: 46 });

    const badges = await get<BadgeDto[]>("/badges");
    expect(badges).toHaveLength(9);
    expect(badges.filter((b) => b.earnedAt).map((b) => b.code).sort()).toEqual(["FIRST_STROKE", "HIRAGANA_MASTER", "PERFECT_10"]);
    expect(badges[0]).toMatchObject({ code: "FIRST_STROKE", nameVi: "Nét đầu tiên", tier: "BRONZE" });
  });

  it("Cú đêm sau 23 giờ địa phương", async () => {
    await signUp();
    now = Date.parse("2026-09-07T16:30:00Z"); // 23:30 VN
    expect((await attempt(1, 90)).newBadges.sort()).toEqual(["FIRST_STROKE", "NIGHT_OWL"]);
  });

  it("STREAK_7 sau 7 ngày liên tiếp", async () => {
    await signUp();
    await patch("/auth/me", { dailyGoalXp: 10 });
    const awarded: string[] = [];
    for (let d = 0; d < 7; d++) { now = T0 + d * DAY; awarded.push(...(await attempt(1, 90)).newBadges); }
    expect(awarded).toContain("STREAK_7");
  });
});

describe("hàng đợi ôn tập", () => {
  it("tài khoản mới nhận đúng 10 thẻ mới kana trước (hạn mức mỗi ngày), chưa có thẻ từ vựng", async () => {
    await signUp();
    const q = await get<ReviewQueueDto>("/reviews/queue?limit=30");
    expect(q).toMatchObject({ dueCount: 0, newCount: 10 });
    expect(q.content).toHaveLength(10);
    expect(q.content.every((c) => c.itemType === "KANA_WRITING" && c.state === "NEW")).toBe(true);
    expect(q.content[0]).toMatchObject({ character: "あ", romaji: "a", word: null });
    // gọi lại không tạo thêm thẻ
    expect((await get<ReviewQueueDto>("/reviews/queue?limit=30")).content.map((c) => c.cardId)).toEqual(q.content.map((c) => c.cardId));
  });

  it("chấm thẻ: lịch FSRS, XP, và hạn mức thẻ mới tính theo thẻ đã được giới thiệu", async () => {
    await signUp();
    const q = await get<ReviewQueueDto>("/reviews/queue?limit=30");
    const card = q.content[0];

    const good = await post<GradeResultDto>("/reviews/grade", { cardId: card.cardId, grade: 3, durationMs: 1500 });
    expect(good).toMatchObject({ cardId: card.cardId, state: "LEARNING", intervalDays: 0, xpEarned: 10 });
    expect(Date.parse(good.nextDueAt) - now).toBe(10 * 60_000); // bước học thứ hai: 10 phút

    const again = await get<ReviewQueueDto>("/reviews/queue?limit=30");
    expect(again).toMatchObject({ dueCount: 0, newCount: 9 }); // một thẻ đã được giới thiệu → còn 9 thẻ mới

    now += 11 * 60_000;
    const later = await get<ReviewQueueDto>("/reviews/queue?limit=30");
    expect(later.dueCount).toBe(1);
    expect(later.content[0]).toMatchObject({ cardId: card.cardId, state: "LEARNING", reps: 1 });

    const grad = await post<GradeResultDto>("/reviews/grade", { cardId: card.cardId, grade: 3 });
    expect(grad).toMatchObject({ state: "REVIEW" });
    expect(grad.intervalDays).toBeGreaterThanOrEqual(1);
  });

  it("lọc theo loại thẻ và sinh thẻ từ vựng khi được yêu cầu", async () => {
    await signUp();
    const q = await get<ReviewQueueDto>("/reviews/queue?limit=5&types=VOCAB_MEANING");
    expect(q.content).toHaveLength(5);
    expect(q.content[0]).toMatchObject({ itemType: "VOCAB_MEANING", word: "私", reading: "わたし", meaningVi: "tôi", character: null });
    expect((await problem(get("/reviews/queue?types=NONSENSE"))).status).toBe(400);
  });

  it("chấm thẻ không tồn tại / grade sai", async () => {
    await signUp();
    expect((await problem(post("/reviews/grade", { cardId: 12345, grade: 3 }))).status).toBe(404);
    const bad = await problem(post("/reviews/grade", { cardId: 1, grade: 9, score: 101 }));
    expect(bad.errors).toEqual({ grade: "grade phải từ 1 đến 4", score: "Điểm phải từ 0 đến 100" });
  });

  it("thẻ của người khác không chấm được", async () => {
    await signUp();
    const mine = (await get<ReviewQueueDto>("/reviews/queue?limit=3")).content[0];
    localLogout();
    await signUp();
    expect((await problem(post("/reviews/grade", { cardId: mine.cardId, grade: 3 }))).status).toBe(404);
  });
});

describe("từ vựng", () => {
  it("gói FREE chỉ thấy N5; tìm kiếm không phân biệt hoa thường trên từ, cách đọc, romaji và nghĩa", async () => {
    await signUp();
    const all = await get<Page<VocabularyDto>>("/vocabulary?size=100");
    expect(all.totalElements).toBe(70);
    expect(all.content.every((v) => v.jlptLevel === 5)).toBe(true);
    expect((await get<Page<VocabularyDto>>("/vocabulary?level=4")).totalElements).toBe(0);

    expect((await get<Page<VocabularyDto>>(`/vocabulary?q=${encodeURIComponent("NƯỚC")}`)).content.map((v) => v.word)).toContain("水");
    expect((await get<Page<VocabularyDto>>("/vocabulary?q=watashi")).content[0]).toMatchObject({ word: "私", meaningVi: "tôi", id: 1 });
    expect((await get<Page<VocabularyDto>>("/vocabulary?q=がっこう")).content.map((v) => v.word)).toEqual(["学校"]);

    const p2 = await get<Page<VocabularyDto>>("/vocabulary?size=60&page=1");
    expect(p2).toMatchObject({ page: 1, size: 60, totalElements: 70, totalPages: 2 });
    expect(p2.content).toHaveLength(10);
  });
});

describe("quiz", () => {
  it("danh sách 4 bài đã xuất bản; chi tiết không bao giờ kèm đáp án", async () => {
    await signUp();
    const list = await get<Page<QuizDto>>("/quizzes?size=50");
    expect(list.content.map((q) => q.questionCount)).toEqual([10, 10, 10, 8]);
    expect(list.content[0]).toMatchObject({ id: 1, title: "Hiragana cơ bản: đọc âm", quizType: "KANA_READING", timeLimitSec: 180 });

    const detail = await get<QuizDetailDto>("/quizzes/1");
    expect(detail.questions).toHaveLength(10);
    expect(JSON.stringify(detail)).not.toMatch(/correctAnswer|explanationVi/);
    expect(detail.questions[0]).toEqual({ id: 1, prompt: "あ", questionType: "MULTIPLE_CHOICE", options: ["o", "a", "u", "e"], position: 0 });
    expect((await problem(get("/quizzes/999"))).status).toBe(404);
  });

  it("nộp bài chấm bỏ khoảng trắng và hoa thường, câu bỏ trống tính sai, XP = 20 + 5×đúng, chỉ nộp một lần", async () => {
    await signUp();
    const quiz = QUIZZES[3]; // gõ romaji, 8 câu
    const att = await post<{ attemptId: number; totalCount: number }>(`/quizzes/${quiz.id}/attempts`);
    expect(att.totalCount).toBe(8);

    const answers = quiz.questions.map((q, i) => ({
      questionId: q.id,
      givenAnswer: i === 0 ? `  ${q.correctAnswer.toUpperCase()} ` : i === 1 ? "sai" : i === 2 ? undefined : q.correctAnswer,
    }));
    const res = await post<QuizResultDto>(`/quiz-attempts/${att.attemptId}/submit`, { answers: [...answers, { questionId: 99999, givenAnswer: "x" }] });
    expect(res).toMatchObject({ correctCount: 6, totalCount: 8, score: 75, attemptId: att.attemptId });
    expect(res.answers).toHaveLength(8); // câu không thuộc đề bị bỏ qua
    expect(res.answers[0]).toMatchObject({ correct: true, correctAnswer: "sakana" });
    expect(res.answers[1]).toMatchObject({ correct: false, givenAnswer: "sai", explanationVi: expect.any(String) });
    expect(res.answers[2]).toMatchObject({ correct: false, givenAnswer: null });
    expect(res.xpEarned).toBe(20 + 6 * 5 + 50); // + thưởng đạt mục tiêu ngày (50 XP)

    expect((await problem(post(`/quiz-attempts/${att.attemptId}/submit`, { answers }))).detail).toBe("Lượt làm bài này đã được nộp");
    expect((await problem(post("/quiz-attempts/777/submit", { answers }))).status).toBe(404);
    expect((await problem(post(`/quiz-attempts/${att.attemptId}/submit`, { answers: [] }))).status).toBe(400);
  });

  it("lượt làm bài của người khác không nộp được", async () => {
    await signUp();
    const att = await post<{ attemptId: number }>("/quizzes/1/attempts");
    localLogout();
    await signUp();
    expect((await problem(post(`/quiz-attempts/${att.attemptId}/submit`, { answers: [{ questionId: 1, givenAnswer: "a" }] }))).status).toBe(404);
  });
});

describe("bảng xếp hạng tuần", () => {
  it("xếp theo XP trong tuần, hoà thì theo id, bỏ người chưa có XP, tính hạng của mình", async () => {
    await signUp({ displayName: "Một" });   // id 1
    await attempt(1, 90);                   // 25 XP
    localLogout();
    await signUp({ displayName: "Hai" });   // id 2
    await attempt(1, 90); await attempt(1, 90); await attempt(1, 90); // 25+10+10 = 45
    localLogout();
    await signUp({ displayName: "Ba" });    // id 3 — chưa học gì

    const board = await get<LeaderboardDto>("/leaderboard/weekly?limit=50");
    expect(board.weekStart).toBe("2026-09-07");
    expect(board.entries.map((e) => [e.rank, e.displayName, e.xp])).toEqual([[1, "Hai", 45], [2, "Một", 25]]);
    expect(board.myRank).toBeNull();

    await attempt(2, 90); await attempt(2, 90); await attempt(2, 90); await attempt(2, 90); // 25+10+10+10 = 55 ≥ 50 → +50 = 105
    const after = await get<LeaderboardDto>("/leaderboard/weekly");
    expect(after.entries[0]).toMatchObject({ rank: 1, displayName: "Ba", xp: 105 });
    expect(after.myRank).toBe(1);

    const limited = await get<LeaderboardDto>("/leaderboard/weekly?limit=1");
    expect(limited.entries).toHaveLength(1);

    localLogout();
    await localAuth("login", { emailOrUsername: "user" + (n - 2), password: "matkhau-123" }); // "Một"
    expect((await get<LeaderboardDto>("/leaderboard/weekly?limit=1")).myRank).toBe(3); // ngoài top → đếm số người XP cao hơn
  });

  it("XP của tuần trước không tính", async () => {
    await signUp();
    await attempt(1, 90);
    now = T0 + 7 * DAY; // thứ Hai tuần sau
    expect((await get<LeaderboardDto>("/leaderboard/weekly")).entries).toEqual([]);
  });
});

describe("hợp đồng chung", () => {
  it("đường dẫn lạ trả 404 RFC 7807 kèm instance; chưa đăng nhập trả 401", async () => {
    const unauth = await problem(get("/stats/me"));
    expect(unauth).toMatchObject({ status: 401, title: "Chưa xác thực", instance: "/api/v1/stats/me" });
    await signUp();
    expect(await problem(get("/nope"))).toMatchObject({ status: 404, instance: "/api/v1/nope" });
    expect((await problem(get("/stats/heatmap?days=abc"))).status).toBe(400);
  });

  it("dữ liệu trả về tách khỏi nội dung dùng chung (sửa kết quả không làm hỏng danh mục)", async () => {
    await signUp();
    const kana = await get<KanaCharacterDto[]>("/kana");
    kana[0].character = "X";
    expect((await get<KanaCharacterDto[]>("/kana"))[0].character).toBe("あ");
  });

  it("dữ liệu bền qua các lần tải lại và không lẫn giữa các tài khoản", async () => {
    await signUp();
    await attempt(1, 90);
    localLogout();
    await signUp();
    expect((await get<StatsDto>("/stats/me")).xpTotal).toBe(0);
    localLogout();
    await localAuth("login", { emailOrUsername: "user" + (n - 1), password: "matkhau-123" });
    expect((await get<StatsDto>("/stats/me")).xpTotal).toBe(25);
  });
});
