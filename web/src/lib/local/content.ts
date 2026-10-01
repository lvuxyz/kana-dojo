/** Nội dung tĩnh thay cho các bảng dữ liệu của backend.
 *
 *  - Kana: lấy từ `data/kana-data.json`; `id` = vị trí + 1, đúng thứ tự KanaSeeder gán id trên DB mới.
 *  - Từ vựng, quiz, huy hiệu, hạn mức gói: `data/content.json`, trích từ migration V2/V3 của backend. */
import raw from "../../data/content.json";
import { KANA } from "../kana";
import type { BadgeDto, KanaCharacterDto, Plan, VocabularyDto } from "../types";

export interface QuestionRow {
  id: number; prompt: string; questionType: "MULTIPLE_CHOICE" | "TEXT_INPUT";
  options: string[]; correctAnswer: string; explanationVi: string | null; position: number;
}

export interface QuizRow {
  id: number; title: string; description: string | null; quizType: string;
  jlptLevel: number | null; timeLimitSec: number | null; questions: QuestionRow[];
}

export interface BadgeRow extends Omit<BadgeDto, "earnedAt"> { sortOrder: number }

interface ContentFile {
  planFeatures: Record<Plan, Record<string, number | null>>;
  badges: BadgeRow[];
  vocabulary: VocabularyDto[];
  quizzes: QuizRow[];
}

const content = raw as unknown as ContentFile;

export const PLAN_FEATURES = content.planFeatures;
export const BADGES = [...content.badges].sort((a, b) => a.sortOrder - b.sortOrder);
export const VOCABULARY = content.vocabulary;
export const QUIZZES = content.quizzes;

export const KANA_CATALOG: KanaCharacterDto[] = KANA.chars.map((k, i) => ({
  id: i + 1,
  character: k.c,
  romaji: k.r,
  script: k.s === "h" ? "HIRAGANA" : "KATAKANA",
  group: k.g === "basic" ? "BASIC" : k.g === "dakuten" ? "DAKUTEN" : "YOON",
  rowKey: k.row,
  colIndex: k.col,
  strokeCount: k.n,
  readingVi: k.vn,
  displayOrder: i,
}));

export const kanaById = (id: number) => KANA_CATALOG[id - 1];
export const vocabById = (id: number) => VOCABULARY[id - 1];
