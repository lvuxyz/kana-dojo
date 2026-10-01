/** Quiz — port của QuizService: đề không bao giờ kèm đáp án, chấm khi nộp, mỗi lượt chỉ nộp một lần. */
import type { Page, QuizAttemptDto, QuizDetailDto, QuizDto, QuizResultDto } from "../types";
import { QUIZZES } from "./content";
import { nowMs, type Db, type LocalUser } from "./db";
import { notFound, validation } from "./errors";
import { dataFor, evaluateBadges, quizDelta, quizXp, recordActivity } from "./gamification";

/** Số lượt làm bài đã nộp được giữ lại để báo "đã nộp"; cũ hơn thì bỏ để kho không phình ra. */
const KEEP_ATTEMPTS = 300;

const requireQuiz = (id: number) => {
  const quiz = QUIZZES.find((q) => q.id === id);
  if (!quiz) throw notFound("Không tìm thấy bài kiểm tra");
  return quiz;
};

export function listQuizzes(page: number, size: number): Page<QuizDto> {
  const p = Math.max(page, 0);
  const s = Math.min(Math.max(size, 1), 2000);
  const rows = QUIZZES.map<QuizDto>((q) => ({
    id: q.id, title: q.title, description: q.description, quizType: q.quizType,
    jlptLevel: q.jlptLevel, timeLimitSec: q.timeLimitSec, questionCount: q.questions.length,
  }));
  return { content: rows.slice(p * s, p * s + s), page: p, size: s, totalElements: rows.length, totalPages: Math.ceil(rows.length / s) };
}

export function quizDetail(id: number): QuizDetailDto {
  const q = requireQuiz(id);
  return {
    id: q.id, title: q.title, description: q.description, quizType: q.quizType,
    jlptLevel: q.jlptLevel, timeLimitSec: q.timeLimitSec,
    questions: [...q.questions].sort((a, b) => a.position - b.position)
      .map(({ id: qid, prompt, questionType, options, position }) => ({ id: qid, prompt, questionType, options, position })),
  };
}

export function startAttempt(db: Db, user: LocalUser, quizId: number): QuizAttemptDto {
  const quiz = requireQuiz(quizId);
  const d = dataFor(db, user);
  const attemptId = ++db.seq.quizAttempt;
  const startedAt = new Date(nowMs()).toISOString();
  d.quizAttempts[String(attemptId)] = { quizId, startedAt, submitted: false };

  const ids = Object.keys(d.quizAttempts).map(Number).sort((a, b) => a - b);
  for (const old of ids.slice(0, Math.max(ids.length - KEEP_ATTEMPTS, 0))) delete d.quizAttempts[String(old)];
  return { attemptId, quizId, startedAt, totalCount: quiz.questions.length };
}

/** So khớp bỏ khoảng trắng thừa và hoa thường: người học gõ tay romaji rất dễ lệch. */
const isCorrect = (expected: string, given: string | null | undefined) =>
  given != null && expected.trim().toLowerCase() === given.trim().toLowerCase();

export interface SubmitRequest { answers?: { questionId?: number; givenAnswer?: string | null }[] }

export function submitAttempt(db: Db, user: LocalUser, attemptId: number, req: SubmitRequest): QuizResultDto {
  if (!req.answers || req.answers.length === 0) throw validation({ answers: "Danh sách câu trả lời không được rỗng" });
  for (const a of req.answers) {
    if (a.questionId == null) throw validation({ "answers[].questionId": "Thiếu questionId" });
    if ((a.givenAnswer ?? "").length > 512) throw validation({ "answers[].givenAnswer": "Câu trả lời quá dài" });
  }

  const d = dataFor(db, user);
  const attempt = d.quizAttempts[String(attemptId)];
  if (!attempt) throw notFound("Không tìm thấy lượt làm bài");
  if (attempt.submitted) throw validation({}, "Lượt làm bài này đã được nộp");

  const quiz = requireQuiz(attempt.quizId);
  const byId = new Map(quiz.questions.map((q) => [q.id, q]));

  const answers: QuizResultDto["answers"] = [];
  let correctCount = 0;
  for (const input of req.answers) {
    const question = byId.get(input.questionId!);
    if (!question) continue; // câu hỏi không thuộc đề này: bỏ qua thay vì làm hỏng cả bài nộp
    const correct = isCorrect(question.correctAnswer, input.givenAnswer);
    if (correct) correctCount++;
    answers.push({
      questionId: question.id, givenAnswer: input.givenAnswer ?? null, correct,
      correctAnswer: question.correctAnswer, explanationVi: question.explanationVi,
    });
  }

  const total = quiz.questions.length;
  const score = Math.round((100 * correctCount) / Math.max(total, 1));
  attempt.submitted = true;

  const durationMs = Math.max(nowMs() - Date.parse(attempt.startedAt), 0);
  const outcome = recordActivity(db, user, quizDelta(quizXp(correctCount), durationMs));
  evaluateBadges(db, user, "QUIZ_SUBMITTED");

  return { attemptId, quizId: quiz.id, score, correctCount, totalCount: total, xpEarned: outcome.xpAwarded, answers };
}
