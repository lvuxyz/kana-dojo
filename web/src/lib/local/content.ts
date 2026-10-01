/* Từ vựng và quiz — bản port của VocabularyService và QuizService. Nội dung đến từ web/src/data/*.json
   (trích từ V3__seed_content.sql); kết quả làm bài nằm trong localStorage. */

import { badRequest, notFound } from "../api-error";
import type {
  Page, QuestionDto, QuizAttemptDto, QuizDetailDto, QuizDto, QuizResultDto, VocabularyDto,
} from "../types";
import quizData from "../../data/quizzes.json";
import { VOCAB_LIST } from "./catalog";
import { activity, evaluateBadges, quizXp, recordActivity } from "./gamification";
import type { LocalState } from "./store";

function paginate<T>(items: T[], page: number, size: number): Page<T> {
  const p = Math.max(Math.trunc(page) || 0, 0);
  const s = Math.min(Math.max(Math.trunc(size) || 20, 1), 200);
  return {
    content: items.slice(p * s, p * s + s),
    page: p,
    size: s,
    totalElements: items.length,
    totalPages: Math.ceil(items.length / s),
  };
}

// ---------------------------------------------------------------------------
// Từ vựng
// ---------------------------------------------------------------------------

/** Lọc theo cấp JLPT và tìm không phân biệt hoa thường trên từ, cách đọc, romaji và nghĩa. */
export function searchVocabulary(level: number | null, keyword: string | null, page: number, size: number): Page<VocabularyDto> {
  const q = (keyword ?? "").trim().toLowerCase();
  const matches = VOCAB_LIST.filter((v) => {
    if (level !== null && v.jlptLevel !== level) return false;
    if (!q) return true;
    return [v.word, v.reading, v.romaji, v.meaningVi].some((field) => field.toLowerCase().includes(q));
  });
  return paginate(matches, page, size);
}

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

interface QuizRecord {
  id: number;
  title: string;
  description: string | null;
  quizType: string;
  jlptLevel: number | null;
  timeLimitSec: number | null;
  published: boolean;
  questions: { id: number; prompt: string; questionType: string; options: string[]; correctAnswer: string; explanationVi: string | null; position: number }[];
}

const QUIZZES = quizData as QuizRecord[];
const published = () => QUIZZES.filter((q) => q.published);

function requirePublished(id: number): QuizRecord {
  const quiz = published().find((q) => q.id === id);
  if (!quiz) throw notFound("Không tìm thấy bài kiểm tra");
  return quiz;
}

const toQuizDto = (q: QuizRecord): QuizDto => ({
  id: q.id, title: q.title, description: q.description, quizType: q.quizType, jlptLevel: q.jlptLevel,
  timeLimitSec: q.timeLimitSec, questionCount: q.questions.length,
});

export function listQuizzes(page: number, size: number): Page<QuizDto> {
  return paginate(published().map(toQuizDto), page, size);
}

/** Đề bài gửi cho giao diện không kèm đáp án đúng. */
export function quizDetail(id: number): QuizDetailDto {
  const quiz = requirePublished(id);
  const questions: QuestionDto[] = [...quiz.questions]
    .sort((a, b) => a.position - b.position)
    .map((q) => ({ id: q.id, prompt: q.prompt, questionType: q.questionType as QuestionDto["questionType"], options: q.options, position: q.position }));
  return {
    id: quiz.id, title: quiz.title, description: quiz.description, quizType: quiz.quizType,
    jlptLevel: quiz.jlptLevel, timeLimitSec: quiz.timeLimitSec, questions,
  };
}

export function startQuizAttempt(state: LocalState, quizId: number, now: Date): QuizAttemptDto {
  const quiz = requirePublished(quizId);
  const attemptId = state.nextAttemptId++;
  state.quizAttempts[String(attemptId)] = { quizId, startedAt: now.toISOString(), submitted: false };
  // Chỉ giữ lượt gần đây: kết quả không được xem lại ở đâu, không cần phình dữ liệu.
  const ids = Object.keys(state.quizAttempts).map(Number).sort((a, b) => b - a);
  for (const old of ids.slice(30)) delete state.quizAttempts[String(old)];
  return { attemptId, quizId, startedAt: now.toISOString(), totalCount: quiz.questions.length };
}

/** So khớp bỏ khoảng trắng thừa và hoa thường: người học gõ tay romaji rất dễ lệch. */
const isCorrect = (expected: string, given: string | null | undefined) =>
  given != null && expected.trim().toLowerCase() === given.trim().toLowerCase();

export interface SubmitInput { answers?: { questionId?: number; givenAnswer?: string | null }[] }

export function submitQuizAttempt(state: LocalState, attemptId: number, input: SubmitInput, now: Date): QuizResultDto {
  if (!Array.isArray(input.answers) || input.answers.length === 0) {
    throw badRequest("Danh sách câu trả lời không được rỗng");
  }
  const attempt = state.quizAttempts[String(attemptId)];
  if (!attempt) throw notFound("Không tìm thấy lượt làm bài");
  if (attempt.submitted) throw badRequest("Lượt làm bài này đã được nộp");

  const quiz = requirePublished(attempt.quizId);
  const byId = new Map(quiz.questions.map((q) => [q.id, q]));

  let correctCount = 0;
  const answers: QuizResultDto["answers"] = [];
  for (const a of input.answers) {
    const q = typeof a.questionId === "number" ? byId.get(a.questionId) : undefined;
    // Câu hỏi không thuộc đề này: bỏ qua thay vì làm hỏng cả bài nộp.
    if (!q) continue;
    const given = a.givenAnswer ?? null;
    if (given !== null && given.length > 512) throw badRequest("Câu trả lời quá dài");
    const correct = isCorrect(q.correctAnswer, given);
    if (correct) correctCount++;
    answers.push({ questionId: q.id, givenAnswer: given, correct, correctAnswer: q.correctAnswer, explanationVi: q.explanationVi });
  }

  const total = quiz.questions.length;
  const score = Math.round((100 * correctCount) / Math.max(total, 1));
  const durationMs = Math.min(now.getTime() - new Date(attempt.startedAt).getTime(), 2 ** 31 - 1);
  attempt.submitted = true;

  const outcome = recordActivity(state, activity.quiz(quizXp(correctCount), durationMs), now);
  evaluateBadges(state, "QUIZ_SUBMITTED", now);

  return { attemptId, quizId: quiz.id, score, correctCount, totalCount: total, xpEarned: outcome.xpAwarded, answers };
}
