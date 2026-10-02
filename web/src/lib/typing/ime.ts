import type { Phrase } from "./phrases";
import { isSkipped, toRomaji } from "./romaji";

/** Chuẩn hoá chữ IME trả về: NFKC gộp full-width/half-width, bỏ dấu câu và khoảng trắng. */
export function normalizeIme(s: string): string {
  return Array.from(s.normalize("NFKC")).filter((ch) => !isSkipped(ch)).join("");
}

/** So chữ đã chốt với chữ mẫu: số ký tự đầu đã khớp và có chữ sai/thừa phía sau hay không. */
export function compareIme(typed: string, target: string): { matched: number; wrong: boolean } {
  let matched = 0;
  while (matched < typed.length && matched < target.length && typed[matched] === target[matched]) matched++;
  return { matched, wrong: typed.length > matched };
}

/** Ở chế độ IME không đếm được phím (bộ gõ nuốt hết), nên quy đổi phần đã khớp ra số phím romaji
 *  tối thiểu để KPM và điểm so được với các cách nhập khác. Cụm kanji chỉ tính khi đã đổi đúng trọn cụm. */
export function imeProgress(p: Phrase, matched: number): { keys: number; chars: number } {
  let reading = "";
  for (const s of p.segments) {
    if (!s.reading) continue;
    if (s.imeStart + s.text.length > matched) break;
    reading += s.reading;
  }
  return { keys: toRomaji(reading).length, chars: reading.length };
}
