import { LIMITS } from "@/lib/space/space";
import { validateTypingText } from "./phrases";

/* Nhập cả một đoạn văn bản thành "Câu của tôi": tách câu, kèm nghĩa nếu có, và kiểm tra từng câu bằng đúng
   validateTypingText — câu không gõ được được trả về kèm lý do để người học sửa, không bị nhập rồi làm kẹt ván. */

export interface ImportLine {
  text: string;
  vi: string;
  /** Lý do câu không nhập được (tiếng Việt), `null` nếu gõ được */
  reason: string | null;
}

/** Tệp văn bản lớn hơn mức này chắc chắn vượt giới hạn câu luyện gõ — không đọc. */
export const MAX_IMPORT_BYTES = 256 * 1024;

const ENDS = new Set(["。", "！", "？", "!", "?", "…"]);
const CLOSERS = new Set(["」", "』", "）", ")", "”", "’", "\"", "'"]);

/** Katakana nửa độ rộng (ｶﾀｶﾅ) → katakana thường; không NFKC cả câu vì nó đổi ～ thành ~ (không gõ được). */
const widenKana = (s: string) => s.replace(/[｡-ﾟ]+/g, (m) => m.normalize("NFKC"));

/** Lỗi hay gặp nhất khi dán văn bản thật — kanji trần — báo ngắn gọn, đủ để sửa ngay trong ô. */
function shortReason(text: string): string | null {
  const bare = text.replace(/\{[^|}]+\|[^}]+\}/g, "").match(/\p{Script=Han}/u);
  return bare ? `Kanji “${bare[0]}” chưa có cách đọc — viết {${bare[0]}|…}` : null;
}

/** Vị trí của dấu ngăn nghĩa (Tab, hoặc | nằm ngoài cụm {漢字|かんじ}); -1 nếu không có. */
function meaningSeparator(line: string): number {
  const tab = line.indexOf("\t");
  if (tab >= 0) return tab;
  let depth = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth = Math.max(0, depth - 1);
    else if (ch === "|" && depth === 0) return i;
  }
  return -1;
}

/** Tách sau 。！？ (kèm dấu đóng ngoặc theo sau), không bao giờ cắt giữa một cụm {漢字|かんじ}. */
export function splitSentences(line: string): string[] {
  const chars = Array.from(line);
  const out: string[] = [];
  let cur = "";
  let depth = 0;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    cur += ch;
    if (ch === "{") depth++;
    else if (ch === "}") depth = Math.max(0, depth - 1);
    if (depth > 0 || !ENDS.has(ch)) continue;
    while (i + 1 < chars.length && (ENDS.has(chars[i + 1]) || CLOSERS.has(chars[i + 1]))) cur += chars[++i];
    out.push(cur);
    cur = "";
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

/**
 * Văn bản dán vào / đọc từ tệp → danh sách câu.
 * - Mỗi dòng một đoạn; dòng trống và dòng bắt đầu bằng `#` bị bỏ qua.
 * - Dòng có nghĩa (`câu<Tab>nghĩa` hoặc `câu | nghĩa`) giữ nguyên là một câu.
 * - Dòng không có nghĩa được tách thành từng câu ở 。！？.
 * - Câu trùng (trong chính văn bản) chỉ giữ lần đầu.
 */
export function parseTypingImport(input: string): ImportLine[] {
  const out: ImportLine[] = [];
  const seen = new Set<string>();
  const push = (text: string, vi: string) => {
    const t = text.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    const reason = Array.from(t).length > LIMITS.text
      ? `Câu dài hơn ${LIMITS.text} ký tự — hãy ngắt bớt (xuống dòng hoặc thêm 。).`
      : shortReason(t) ?? validateTypingText(t);
    out.push({ text: t, vi: vi.trim().slice(0, LIMITS.textVi), reason });
  };

  for (const raw of widenKana(input.replace(/^﻿/, "")).split(/\r\n|\r|\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = meaningSeparator(line);
    if (sep >= 0) push(line.slice(0, sep), line.slice(sep + 1).replace(/\t/g, " "));
    else for (const s of splitSentences(line)) push(s, "");
  }
  return out;
}

/** Những câu chưa nhập được, viết lại thành văn bản để người học sửa ngay trong ô nhập. */
export const importLinesToText = (lines: readonly ImportLine[]): string =>
  lines.map((l) => (l.vi ? `${l.text} | ${l.vi}` : l.text)).join("\n");

/**
 * Đọc tệp văn bản: UTF-8 (có hoặc không BOM), nếu không phải UTF-8 hợp lệ thì thử Shift_JIS —
 * bảng mã của rất nhiều tệp .txt tiếng Nhật cũ.
 */
export function decodeTextFile(bytes: BufferSource): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("shift_jis").decode(bytes);
  }
}
