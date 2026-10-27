import { VOCABULARY } from "@/data/vocabulary";
import type { Vocabulary } from "./types";

/** Các cấp JLPT thực sự có từ, khó nhất xếp sau (N5, N4, …). */
export const VOCAB_LEVELS = [...new Set(VOCABULARY.map((v) => v.jlptLevel).filter((l): l is number => l !== null))].sort((a, b) => b - a);

/** Bỏ dấu và hoa/thường để gõ "ban" vẫn tìm ra "bạn". */
// Bỏ dấu tiếng Việt nhưng giữ dấu đục/bán đục của kana (U+3099/U+309A): ゴ không được thành コ.
export const fold = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/(?![゙゚])\p{M}/gu, "").normalize("NFC").replace(/đ/g, "d");

const SEARCHABLE = VOCABULARY.map((v) => ({ v, text: fold([v.word, v.reading, v.romaji, v.meaningVi].join("\n")) }));

/** Mọi từ của một cấp JLPT khớp từ khoá (trong từ, cách đọc, romaji hoặc nghĩa). Không phân trang và không cắt bớt:
 *  bản cũ gọi API với size=60 nên 10 trong 70 từ N5 không bao giờ hiện ra. */
export function searchVocabulary(level: number, query: string): Vocabulary[] {
  const needle = fold(query.trim());
  return SEARCHABLE.filter(({ v, text }) => v.jlptLevel === level && (!needle || text.includes(needle))).map((x) => x.v);
}
