/* Các kiểu này phản chiếu DTO trong docs/SPEC.md mục 5. Sửa một bên phải sửa bên kia. */

export type Plan = "FREE" | "PRO";
export type CardState = "NEW" | "LEARNING" | "REVIEW" | "RELEARNING";
export type ItemType = "KANA_WRITING" | "KANA_READING" | "VOCAB_MEANING" | "VOCAB_READING";
export type PracticeMode = "TRACE" | "TEST";

export interface UserDto {
  id: number; email: string; username: string; displayName: string;
  avatarUrl: string | null; role: "USER" | "ADMIN"; plan: Plan;
  timezone: string; locale: string; dailyGoalXp: number; createdAt: string;
}

export interface AuthResponse {
  accessToken: string; refreshToken: string; expiresIn: number; user: UserDto;
}

export interface StatsDto {
  xpTotal: number; level: number; xpToNextLevel: number;
  currentStreak: number; longestStreak: number; streakFreezes: number;
  todayXp: number; dailyGoalXp: number; goalMet: boolean;
}

export interface HeatmapDay { date: string; xp: number; reviews: number }

export interface GradeResultDto {
  cardId: number; nextDueAt: string; intervalDays: number;
  stability: number; difficulty: number; state: CardState; xpEarned: number;
}

export interface BadgeDto {
  code: string; nameVi: string; descriptionVi: string;
  icon: string; tier: "BRONZE" | "SILVER" | "GOLD"; earnedAt: string | null;
}

export interface WritingResultDto {
  passed: boolean; avgScore: number; grade: 1 | 2 | 3 | 4;
  /** Mã huy hiệu vừa đạt (BadgeDto.code) — tra tên qua GET /badges. */
  xpEarned: number; card: GradeResultDto | null; newBadges: string[];
}

export interface KanaProgressDto {
  characterId: number; character: string; state: CardState;
  dueAt: string | null; bestScore: number; level: 0 | 1 | 2;
}

export interface ProgressSummaryDto {
  kanaLearned: number; kanaMastered: number; vocabLearned: number;
  dueToday: number; newAvailable: number;
}

/** Một thẻ trong hàng đợi. Thẻ KANA_* có character/romaji/readingVi, thẻ VOCAB_* có word/reading/meaningVi. */
export interface ReviewQueueItemDto {
  cardId: number; itemType: ItemType; itemId: number;
  state: CardState; dueAt: string; reps: number; lapses: number;
  character: string | null; romaji: string | null; readingVi: string | null;
  word: string | null; reading: string | null; meaningVi: string | null;
}

export interface ReviewQueueDto {
  content: ReviewQueueItemDto[]; dueCount: number; newCount: number;
}

export interface LeaderboardDto {
  weekStart: string; myRank: number | null;
  entries: { rank: number; userId: number; displayName: string; avatarUrl: string | null; xp: number }[];
}

export interface VocabularyDto {
  id: number; word: string; reading: string; romaji: string;
  meaningVi: string; meaningEn: string | null; jlptLevel: number | null; partOfSpeech: string | null;
  exampleJa: string | null; exampleVi: string | null; audioUrl: string | null;
}

export interface Page<T> {
  content: T[]; page: number; size: number; totalElements: number; totalPages: number;
}

/** RFC 7807 Problem Details — backend trả đúng định dạng này cho mọi lỗi */
export interface ProblemDetail {
  type: string; title: string; status: number; detail: string;
  instance?: string; errors?: Record<string, string>;
}

export interface KanaCharacterDto {
  id: number; character: string; romaji: string;
  script: "HIRAGANA" | "KATAKANA"; group: "BASIC" | "DAKUTEN" | "YOON";
  rowKey: string; colIndex: number; strokeCount: number; readingVi: string | null; displayOrder: number;
}

export type QuestionType = "MULTIPLE_CHOICE" | "TEXT_INPUT";

export interface QuizDto {
  id: number; title: string; description: string | null;
  quizType: string; jlptLevel: number | null; timeLimitSec: number | null; questionCount: number;
}

/** Đề bài — không bao giờ kèm đáp án đúng. */
export interface QuestionDto {
  id: number; prompt: string; questionType: QuestionType; options: string[]; position: number;
}

export interface QuizDetailDto extends Omit<QuizDto, "questionCount"> {
  questions: QuestionDto[];
}

export interface QuizAttemptDto { attemptId: number; quizId: number; startedAt: string; totalCount: number }

export interface AnswerResultDto {
  questionId: number; givenAnswer: string | null; correct: boolean;
  correctAnswer: string; explanationVi: string | null;
}

export interface QuizResultDto {
  attemptId: number; quizId: number; score: number; correctCount: number;
  totalCount: number; xpEarned: number; answers: AnswerResultDto[];
}
