/* Phím tắt kiểu Anki cho trang Ôn tập. Thuần hàm/không DOM nên test được bằng Node (review-keys.test.ts).

   Khác bản thiết kế đầu ở hai chỗ, đều để không làm hỏng lịch FSRS:
   - Space/Enter sau khi lật là "Được" (3) như Anki, không phải "Dễ". Thói quen Anki là bấm Space hai lần
     (lật rồi chấm); nếu Space là "Dễ" thì mọi thẻ đều bị đẩy ra khoảng cách dài nhất.
   - Bỏ qua phím tự lặp: giữ Space không được vừa lật vừa chấm trước khi kịp đọc đáp án. */

import type { Grade } from "./types";

/** Chỗ đang có focus khi bấm phím.
 *  - `editable`: ô nhập liệu — mọi phím tắt tạm tắt.
 *  - `control`: nút, liên kết, `<summary>` — Space/Enter để trình duyệt kích hoạt chính phần tử đó.
 *  - `none`: còn lại. */
export type KeyTarget = "editable" | "control" | "none";

export interface KeyInput {
  key: string;
  code: string;
  repeat: boolean;
  /** Có Ctrl/Meta/Alt: nhường cho trình duyệt (Ctrl+R tải lại, Ctrl+1..4 đổi tab). */
  modified: boolean;
  /** Đang gõ IME dở chừng. */
  composing: boolean;
  target: KeyTarget;
}

export interface ReviewKeyState {
  revealed: boolean;
  /** Thẻ viết nét: bàn phím không làm gì, điểm do nét viết quyết định. */
  writing: boolean;
  /** Thẻ có chữ tiếng Nhật để đọc. */
  speakable: boolean;
}

export type ReviewKeyAction = { type: "reveal" } | { type: "grade"; grade: Grade } | { type: "speak" } | null;

/** Space/Enter sau khi lật: "Được" như Anki. */
export const DEFAULT_GRADE: Grade = 3;

const GRADE_CODES: Record<string, Grade> = {
  Digit1: 1, Digit2: 2, Digit3: 3, Digit4: 4,
  Numpad1: 1, Numpad2: 2, Numpad3: 3, Numpad4: 4,
};

/** Số 1–4 theo ký tự, hoặc theo vị trí phím khi bàn phím không gõ ra số (AZERTY: Digit1 là "&"). */
function gradeOf(k: KeyInput): Grade | null {
  if (k.key >= "1" && k.key <= "4" && k.key.length === 1) return Number(k.key) as Grade;
  return GRADE_CODES[k.code] ?? null;
}

/** Phím R theo ký tự; với bàn phím không ra chữ Latin (tiếng Nga…) thì theo vị trí phím. */
function isReplay(k: KeyInput): boolean {
  if (/^[a-z]$/i.test(k.key)) return k.key.toLowerCase() === "r";
  return k.code === "KeyR";
}

export function reviewKeyAction(k: KeyInput, s: ReviewKeyState): ReviewKeyAction {
  if (s.writing || k.modified || k.composing || k.repeat || k.target === "editable") return null;

  if (k.key === " " || k.key === "Enter") {
    if (k.target === "control") return null;
    return s.revealed ? { type: "grade", grade: DEFAULT_GRADE } : { type: "reveal" };
  }

  const g = gradeOf(k);
  if (g !== null) return s.revealed ? { type: "grade", grade: g } : null;

  // Chỉ đọc sau khi lật: với thẻ hỏi cách đọc (kana → romaji, kanji → cách đọc) thì nghe là lộ đáp án.
  if (isReplay(k)) return s.revealed && s.speakable ? { type: "speak" } : null;

  return null;
}

const JAPANESE = /[぀-ヿ㐀-䶿一-鿿豈-﫿ｦ-ﾟ]/;

export const hasJapanese = (text: string) => JAPANESE.test(text);

/** Chữ đầu tiên có tiếng Nhật trong các mặt của thẻ. Thẻ tự soạn có thể có mặt tiếng Việt —
 *  đưa nó cho giọng ja-JP thì chỉ ra tiếng vô nghĩa. */
export function spokenText(...sides: (string | null)[]): string | null {
  return sides.find((t): t is string => !!t && hasJapanese(t)) ?? null;
}
