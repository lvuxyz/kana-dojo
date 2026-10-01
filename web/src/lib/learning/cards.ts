import { VOCABULARY } from "@/data/vocabulary";
import { KANA, type KanaChar } from "../kana";
import type { ItemType, Vocabulary } from "../types";

/* Một thẻ = một *khía cạnh* (viết / đọc / nghĩa) của một mục nội dung.
   Khoá thẻ là "<loại>:<mã mục>", ví dụ "KANA_WRITING:あ" hay "VOCAB_MEANING:12" — xác định duy nhất, không cần
   bảng id như khi có CSDL. */

/** Thứ tự này cũng là thứ tự ưu tiên khi cấp thẻ mới. */
export const ALL_TYPES: readonly ItemType[] = ["KANA_WRITING", "KANA_READING", "VOCAB_MEANING", "VOCAB_READING"];

export const isKanaType = (t: ItemType) => t === "KANA_WRITING" || t === "KANA_READING";

export const cardKey = (itemType: ItemType, itemId: string) => `${itemType}:${itemId}`;

export function parseCardKey(key: string): { itemType: ItemType; itemId: string } | null {
  const i = key.indexOf(":");
  if (i < 0) return null;
  const itemType = key.slice(0, i) as ItemType;
  const itemId = key.slice(i + 1);
  return ALL_TYPES.includes(itemType) && itemId ? { itemType, itemId } : null;
}

const kanaByChar = new Map<string, KanaChar>(KANA.chars.map((c) => [c.c, c]));
const vocabById = new Map<string, Vocabulary>(VOCABULARY.map((v) => [String(v.id), v]));

export const findKana = (character: string) => kanaByChar.get(character);
export const findVocab = (id: string) => vocabById.get(id);

/** Mục nội dung của thẻ còn tồn tại không? Thẻ đã lưu có thể trỏ tới mục đã bị gỡ khỏi nội dung
 *  (người dùng nhập tệp sao lưu cũ, hoặc nội dung bị rút gọn) — những thẻ đó phải bị bỏ qua. */
export const itemExists = (itemType: ItemType, itemId: string) =>
  isKanaType(itemType) ? kanaByChar.has(itemId) : vocabById.has(itemId);

/** Mã mục theo đúng thứ tự dạy học (kana theo bảng ngũ thập âm, từ vựng theo id). */
export function itemIdsOf(itemType: ItemType): string[] {
  return isKanaType(itemType) ? KANA.chars.map((c) => c.c) : VOCABULARY.map((v) => String(v.id));
}
