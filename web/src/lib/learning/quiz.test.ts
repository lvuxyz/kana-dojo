import { describe, expect, it } from "vitest";
import { QUIZZES } from "@/data/quizzes";
import { VOCABULARY } from "@/data/vocabulary";
import { BADGES } from "@/data/badges";
import { findQuiz, isCorrect, submitQuiz } from "./quiz";
import { emptyState } from "./state";
import type { Clock } from "./time";

const clock: Clock = { now: Date.parse("2026-09-07T03:00:00Z"), zone: "Asia/Ho_Chi_Minh" };

describe("nội dung đóng gói", () => {
  it("đúng số lượng đã seed trước đây", () => {
    expect(VOCABULARY).toHaveLength(80);
    expect(VOCABULARY.filter((v) => v.jlptLevel === 5)).toHaveLength(70);
    expect(QUIZZES.map((q) => q.questions.length)).toEqual([10, 10, 10, 8]);
    expect(BADGES).toHaveLength(9);
  });

  it("id duy nhất và liên tục — thẻ ôn tham chiếu tới chúng", () => {
    expect(VOCABULARY.map((v) => v.id)).toEqual(VOCABULARY.map((_, i) => i + 1));
    const ids = QUIZZES.flatMap((q) => q.questions.map((x) => x.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("mọi câu trắc nghiệm có đáp án nằm trong options; câu gõ thì options rỗng", () => {
    for (const q of QUIZZES.flatMap((z) => z.questions)) {
      if (q.questionType === "MULTIPLE_CHOICE") expect(q.options).toContain(q.correctAnswer);
      else expect(q.options).toEqual([]);
    }
  });
});

describe("chấm quiz", () => {
  const quiz = findQuiz(1)!;
  const allCorrect = Object.fromEntries(quiz.questions.map((q) => [q.id, q.correctAnswer]));

  it("so khớp bỏ khoảng trắng và không phân biệt hoa thường", () => {
    expect(isCorrect("sakana", "  SaKaNa ")).toBe(true);
    expect(isCorrect("sakana", "sakanaa")).toBe(false);
    expect(isCorrect("sakana", null)).toBe(false);
    expect(isCorrect("sakana", "")).toBe(false);
  });

  it("đúng hết: 100 điểm, XP = 20 + 5 mỗi câu đúng (+ thưởng mục tiêu ngày)", () => {
    const { state, result } = submitQuiz(emptyState(), 1, allCorrect, 60_000, clock);

    expect(result).toMatchObject({ quizId: 1, score: 100, correctCount: 10, totalCount: 10 });
    expect(result.answers.every((a) => a.correct)).toBe(true);
    // 20 + 10*5 = 70 ≥ mục tiêu 50 → +50 thưởng
    expect(result.xpEarned).toBe(70 + 50);
    expect(state.stats.xpTotal).toBe(120);
    expect(state.stats.currentStreak).toBe(1);
    expect(state.daily["2026-09-07"]).toMatchObject({ reviews: 0, studyMs: 60_000 });
  });

  it("câu bỏ trống tính là sai; điểm tính trên tổng số câu của đề", () => {
    const half = Object.fromEntries(quiz.questions.slice(0, 5).map((q) => [q.id, q.correctAnswer]));
    const { result } = submitQuiz(emptyState(), 1, half, 0, clock);

    expect(result.score).toBe(50);
    expect(result.correctCount).toBe(5);
    const blank = result.answers[9];
    expect(blank).toMatchObject({ givenAnswer: null, correct: false, correctAnswer: quiz.questions[9].correctAnswer });
    expect(blank.explanationVi).toBeTruthy();
  });

  it("nộp toàn câu sai vẫn được XP cơ bản", () => {
    const wrong = Object.fromEntries(quiz.questions.map((q) => [q.id, "???"]));
    const { result } = submitQuiz(emptyState(), 1, wrong, 0, clock);
    expect(result.score).toBe(0);
    expect(result.xpEarned).toBe(20);
  });

  it("quiz gõ romaji chấp nhận khác biệt hoa/thường và khoảng trắng", () => {
    const typed = findQuiz(4)!;
    const answers = Object.fromEntries(typed.questions.map((q) => [q.id, ` ${q.correctAnswer.toUpperCase()} `]));
    expect(submitQuiz(emptyState(), 4, answers, 0, clock).result.score).toBe(100);
  });

  it("quiz không tồn tại bị từ chối", () => {
    expect(() => submitQuiz(emptyState(), 999, {}, 0, clock)).toThrow(/Không tìm thấy/);
  });
});
