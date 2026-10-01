import { QUIZZES } from "@/data/quizzes";
import type { Quiz, QuizAnswerResult, QuizResult } from "../types";
import { quizDelta, quizXp, recordActivity } from "./activity";
import { evaluateBadges } from "./badges";
import type { Outcome } from "./reviews";
import type { ProgressState } from "./state";
import type { Clock } from "./time";

export const findQuiz = (id: number): Quiz | undefined => QUIZZES.find((q) => q.id === id);

/** So khớp bỏ qua khoảng trắng thừa và hoa thường: người học gõ tay romaji rất dễ lệch. */
export function isCorrect(expected: string, given: string | null | undefined): boolean {
  if (given == null) return false;
  return expected.trim().toLowerCase() === given.trim().toLowerCase();
}

/** Chấm bài và cộng XP: 20 điểm cơ bản cộng 5 cho mỗi câu đúng.
 *  `answers` ánh xạ id câu hỏi → câu trả lời; câu không có trong đó tính là sai (điểm tính trên tổng số câu của đề). */
export function submitQuiz(
  state: ProgressState,
  quizId: number,
  answers: Readonly<Record<number, string>>,
  durationMs: number,
  clock: Clock,
): Outcome<QuizResult> {
  const quiz = findQuiz(quizId);
  if (!quiz) throw new Error("Không tìm thấy bài kiểm tra");

  const results: QuizAnswerResult[] = quiz.questions.map((q) => {
    const given = answers[q.id]?.trim() || null;
    return {
      questionId: q.id, givenAnswer: given, correct: isCorrect(q.correctAnswer, given),
      correctAnswer: q.correctAnswer, explanationVi: q.explanationVi,
    };
  });

  const correctCount = results.filter((r) => r.correct).length;
  const totalCount = quiz.questions.length;
  const score = Math.round((100 * correctCount) / Math.max(totalCount, 1));

  const draft = structuredClone(state);
  const outcome = recordActivity(draft, quizDelta(quizXp(correctCount), durationMs), clock);
  const newBadges = evaluateBadges(draft, "QUIZ_SUBMITTED", clock);

  return {
    state: draft,
    result: { quizId, score, correctCount, totalCount, xpEarned: outcome.xpAwarded, answers: results, newBadges },
  };
}
