/* Kiểu dữ liệu dùng chung giữa nội dung tĩnh, bộ máy học (lib/learning) và giao diện.
   Trạng thái được lưu trong trình duyệt (ProgressState) nằm ở lib/learning/state.ts. */

export type CardState = "NEW" | "LEARNING" | "REVIEW" | "RELEARNING";
export type ItemType = "KANA_WRITING" | "KANA_READING" | "VOCAB_MEANING" | "VOCAB_READING";
export type PracticeMode = "TRACE" | "TEST";
/** 1 = Quên · 2 = Khó · 3 = Được · 4 = Dễ */
export type Grade = 1 | 2 | 3 | 4;

// ------------------------------------------------------------------ nội dung tĩnh

export interface Vocabulary {
  id: number; word: string; reading: string; romaji: string;
  meaningVi: string; meaningEn: string | null; jlptLevel: number | null; partOfSpeech: string | null;
  exampleJa: string | null; exampleVi: string | null;
}

export type QuestionType = "MULTIPLE_CHOICE" | "TEXT_INPUT";

export interface QuizQuestion {
  id: number; prompt: string; questionType: QuestionType; options: string[];
  correctAnswer: string; explanationVi: string | null;
}

export interface Quiz {
  id: number; title: string; description: string | null;
  quizType: string; jlptLevel: number | null; timeLimitSec: number | null;
  questions: QuizQuestion[];
}

export interface BadgeDef {
  code: string; nameVi: string; descriptionVi: string;
  icon: string; tier: "BRONZE" | "SILVER" | "GOLD";
}

/** Huy hiệu kèm thời điểm đạt (mili-giây epoch), null nếu chưa đạt. */
export interface BadgeStatus extends BadgeDef { earnedAt: number | null }

// ------------------------------------------------------------------ kết quả các thao tác học

export interface StatsView {
  xpTotal: number; level: number; xpToNextLevel: number;
  currentStreak: number; longestStreak: number; streakFreezes: number;
  todayXp: number; dailyGoalXp: number; goalMet: boolean;
}

export interface HeatmapDay { date: string; xp: number; reviews: number }

export interface GradeResult {
  cardKey: string; nextDueAt: number; intervalDays: number;
  stability: number; difficulty: number; state: CardState; xpEarned: number;
}

export interface WritingResult {
  passed: boolean; avgScore: number; grade: Grade;
  xpEarned: number; card: GradeResult;
  /** Mã huy hiệu vừa đạt (BadgeDef.code). */
  newBadges: string[];
}

export interface KanaProgress {
  character: string; state: CardState; dueAt: number | null;
  bestScore: number;
  /** 0 = chưa học · 1 = đang học · 2 = đã qua bước học, vào lịch ôn FSRS. */
  level: 0 | 1 | 2;
}

export interface ProgressSummary {
  kanaLearned: number; kanaMastered: number; dueToday: number;
}

/** Một thẻ trong hàng đợi. Thẻ KANA_* có character/romaji/readingVi, thẻ VOCAB_* có word/reading/meaningVi. */
export interface ReviewQueueItem {
  cardKey: string; itemType: ItemType; itemId: string;
  state: CardState; dueAt: number; reps: number; lapses: number;
  character: string | null; romaji: string | null; readingVi: string | null;
  word: string | null; reading: string | null; meaningVi: string | null;
}

export interface ReviewQueue {
  content: ReviewQueueItem[]; dueCount: number; newCount: number;
}

export interface QuizAnswerResult {
  questionId: number; givenAnswer: string | null; correct: boolean;
  correctAnswer: string; explanationVi: string | null;
}

export interface QuizResult {
  quizId: number; score: number; correctCount: number; totalCount: number;
  xpEarned: number; answers: QuizAnswerResult[]; newBadges: string[];
}
