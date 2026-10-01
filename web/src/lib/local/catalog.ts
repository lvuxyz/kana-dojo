/* Danh mục nội dung cố định (kana, từ vựng) cho chế độ cá nhân.
   Khi có máy chủ, các id này do CSDL cấp; ở đây id được suy ra từ thứ tự trong file dữ liệu — KanaSeeder cũng cấp id
   theo thứ tự file (BIGSERIAL từ 1), nên id kana ở hai chế độ trùng nhau. */

import { KANA, type KanaChar } from "../kana";
import type { KanaCharacterDto, VocabularyDto } from "../types";
import vocabularyData from "../../data/vocabulary.json";

export interface CatalogKana extends KanaChar {
  id: number;
  displayOrder: number;
}

export const KANA_LIST: CatalogKana[] = KANA.chars.map((c, i) => ({ ...c, id: i + 1, displayOrder: i }));

export function kanaById(id: number): CatalogKana | undefined {
  return Number.isInteger(id) ? KANA_LIST[id - 1] : undefined;
}

/** Từ vựng seed (V3__seed_content.sql). `audioUrl` chưa có nguồn âm thanh nên luôn null. */
export const VOCAB_LIST: VocabularyDto[] = vocabularyData.map((v) => ({ ...v, audioUrl: null }));

export function vocabById(id: number): VocabularyDto | undefined {
  return Number.isInteger(id) ? VOCAB_LIST[id - 1] : undefined;
}

const SCRIPT = { h: "HIRAGANA", k: "KATAKANA" } as const;
const GROUP = { basic: "BASIC", dakuten: "DAKUTEN", yoon: "YOON" } as const;

export function toKanaDto(k: CatalogKana): KanaCharacterDto {
  return {
    id: k.id,
    character: k.c,
    romaji: k.r,
    script: SCRIPT[k.s],
    group: GROUP[k.g],
    rowKey: k.row,
    colIndex: k.col,
    strokeCount: k.n,
    readingVi: k.vn,
    displayOrder: k.displayOrder,
  };
}

export function scriptCode(value: string | null | undefined): "h" | "k" | null {
  const v = (value ?? "").trim().toUpperCase();
  return v === "HIRAGANA" ? "h" : v === "KATAKANA" ? "k" : null;
}

export function groupCode(value: string | null | undefined): "basic" | "dakuten" | "yoon" | null {
  const v = (value ?? "").trim().toUpperCase();
  return v === "BASIC" ? "basic" : v === "DAKUTEN" ? "dakuten" : v === "YOON" ? "yoon" : null;
}
