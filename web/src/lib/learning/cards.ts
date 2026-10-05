import { VOCABULARY } from "@/data/vocabulary";
import { KANA, type KanaChar } from "../kana";
import type { ItemType, Vocabulary } from "../types";
import {
  EMPTY_CATALOG, isUserItem, userCardIdOf, userItemId, type Catalog, type StudyOptions, type UserCard,
} from "./context";

/* Một thẻ = một *khía cạnh* (viết / đọc / nghĩa) của một mục nội dung.
   Khoá thẻ là "<loại>:<mã mục>", ví dụ "KANA_WRITING:あ" hay "VOCAB_MEANING:12" — xác định duy nhất, không cần
   bảng id như khi có CSDL. Thẻ tự soạn dùng mã mục `u:<mã thẻ>` (xem context.ts). */

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
export const findUserCard = (itemId: string, catalog: Catalog): UserCard | undefined =>
  isUserItem(itemId) ? catalog.cards.get(userCardIdOf(itemId)) : undefined;

/** Mục nội dung của thẻ còn tồn tại không? Thẻ đã lưu có thể trỏ tới mục đã bị gỡ khỏi nội dung
 *  (người dùng nhập tệp sao lưu cũ, xoá thẻ tự soạn, tắt một bộ thẻ…) — những thẻ đó phải bị bỏ qua. */
export function itemExists(itemType: ItemType, itemId: string, catalog: Catalog = EMPTY_CATALOG): boolean {
  if (isUserItem(itemId)) {
    const card = findUserCard(itemId, catalog);
    return !!card && (itemType === "VOCAB_MEANING" || (itemType === "VOCAB_READING" && card.reverse));
  }
  return isKanaType(itemType) ? kanaByChar.has(itemId) : vocabById.has(itemId);
}

/** Mã mục theo đúng thứ tự dạy học (kana theo bảng ngũ thập âm, từ vựng theo id). Chỉ nội dung đóng gói. */
export function itemIdsOf(itemType: ItemType): string[] {
  return isKanaType(itemType) ? KANA.chars.map((c) => c.c) : VOCABULARY.map((v) => String(v.id));
}

/** Thẻ tự soạn theo thứ tự soạn: chiều xuôi, rồi chiều ngược nếu bộ thẻ hỏi cả hai chiều. */
export function userItemsOf(catalog: Catalog): { itemType: ItemType; itemId: string }[] {
  const out: { itemType: ItemType; itemId: string }[] = [];
  for (const id of catalog.order) {
    const card = catalog.cards.get(id)!;
    out.push({ itemType: "VOCAB_MEANING", itemId: userItemId(id) });
    if (card.reverse) out.push({ itemType: "VOCAB_READING", itemId: userItemId(id) });
  }
  return out;
}

/** Thẻ này có nằm trong cách học người dùng chọn không (nguồn thẻ đang bật, kana trong phạm vi)? */
export function inStudy(itemType: ItemType, itemId: string, study: StudyOptions): boolean {
  if (isUserItem(itemId)) return study.decks;
  if (isKanaType(itemType)) {
    if (itemType === "KANA_WRITING" ? !study.kanaWriting : !study.kanaReading) return false;
    const k = kanaByChar.get(itemId);
    return !!k && study.kanaScripts.includes(k.s) && study.kanaGroups.includes(k.g);
  }
  return study.vocab;
}
