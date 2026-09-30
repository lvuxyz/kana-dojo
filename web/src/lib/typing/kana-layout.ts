import { toHiragana, type Candidate } from "./romaji";

/* かな入力 (JIS X 6002): mỗi phím vật lý là một kana, dấu ゛゜ gõ thành phím riêng sau chữ gốc.
 * Đọc theo KeyboardEvent.code (vị trí phím) chứ không theo key, vì hệ điều hành đang ở bố cục
 * Latin nên key chỉ trả về "a", "s"… Nhờ vậy người học không cần bật IME. */

export interface LayoutKey {
  code: string;
  /** Nhãn in trên phím JIS */
  latin: string;
  kana?: string;
  /** Kana khi giữ Shift */
  shiftKana?: string;
}

export const JIS_KANA_ROWS: LayoutKey[][] = [
  [
    { code: "Digit1", latin: "1", kana: "ぬ" }, { code: "Digit2", latin: "2", kana: "ふ" },
    { code: "Digit3", latin: "3", kana: "あ", shiftKana: "ぁ" }, { code: "Digit4", latin: "4", kana: "う", shiftKana: "ぅ" },
    { code: "Digit5", latin: "5", kana: "え", shiftKana: "ぇ" }, { code: "Digit6", latin: "6", kana: "お", shiftKana: "ぉ" },
    { code: "Digit7", latin: "7", kana: "や", shiftKana: "ゃ" }, { code: "Digit8", latin: "8", kana: "ゆ", shiftKana: "ゅ" },
    { code: "Digit9", latin: "9", kana: "よ", shiftKana: "ょ" }, { code: "Digit0", latin: "0", kana: "わ", shiftKana: "を" },
    { code: "Minus", latin: "-", kana: "ほ" }, { code: "Equal", latin: "^", kana: "へ" },
    { code: "IntlYen", latin: "¥", kana: "ー" },
  ],
  [
    { code: "KeyQ", latin: "Q", kana: "た" }, { code: "KeyW", latin: "W", kana: "て" },
    { code: "KeyE", latin: "E", kana: "い", shiftKana: "ぃ" }, { code: "KeyR", latin: "R", kana: "す" },
    { code: "KeyT", latin: "T", kana: "か" }, { code: "KeyY", latin: "Y", kana: "ん" },
    { code: "KeyU", latin: "U", kana: "な" }, { code: "KeyI", latin: "I", kana: "に" },
    { code: "KeyO", latin: "O", kana: "ら" }, { code: "KeyP", latin: "P", kana: "せ" },
    { code: "BracketLeft", latin: "@", kana: "゛" }, { code: "BracketRight", latin: "[", kana: "゜", shiftKana: "「" },
  ],
  [
    { code: "KeyA", latin: "A", kana: "ち" }, { code: "KeyS", latin: "S", kana: "と" },
    { code: "KeyD", latin: "D", kana: "し" }, { code: "KeyF", latin: "F", kana: "は" },
    { code: "KeyG", latin: "G", kana: "き" }, { code: "KeyH", latin: "H", kana: "く" },
    { code: "KeyJ", latin: "J", kana: "ま" }, { code: "KeyK", latin: "K", kana: "の" },
    { code: "KeyL", latin: "L", kana: "り" }, { code: "Semicolon", latin: ";", kana: "れ" },
    { code: "Quote", latin: ":", kana: "け" }, { code: "Backslash", latin: "]", kana: "む", shiftKana: "」" },
  ],
  [
    { code: "KeyZ", latin: "Z", kana: "つ", shiftKana: "っ" }, { code: "KeyX", latin: "X", kana: "さ" },
    { code: "KeyC", latin: "C", kana: "そ" }, { code: "KeyV", latin: "V", kana: "ひ" },
    { code: "KeyB", latin: "B", kana: "こ" }, { code: "KeyN", latin: "N", kana: "み" },
    { code: "KeyM", latin: "M", kana: "も" }, { code: "Comma", latin: ",", kana: "ね", shiftKana: "、" },
    { code: "Period", latin: ".", kana: "る", shiftKana: "。" }, { code: "Slash", latin: "/", kana: "め", shiftKana: "・" },
    { code: "IntlRo", latin: "\\", kana: "ろ" },
  ],
];

/** Bàn phím US (ANSI) — loại phổ biến ở Việt Nam — không có hai phím ¥ và ろ của JIS.
 *  Phím ` (dưới Esc) đang bỏ trống ở bố cục kana nên dùng thay: ` → ー, Shift+` → ろ. */
export const ANSI_FALLBACK: LayoutKey = { code: "Backquote", latin: "`", kana: "ー", shiftKana: "ろ" };

const BY_CODE = new Map<string, LayoutKey>();
for (const k of [...JIS_KANA_ROWS.flat(), ANSI_FALLBACK]) BY_CODE.set(k.code, k);

/** Kana (hoặc dấu ゛゜) mà phím vật lý này sinh ra; undefined nếu phím không thuộc bố cục. */
export function kanaFromKey(code: string, shift: boolean): string | undefined {
  const k = BY_CODE.get(code);
  if (!k) return undefined;
  return shift ? (k.shiftKana ?? k.kana) : k.kana;
}

/** Phím cần bấm để ra một token kana — để tô sáng trên bàn phím ảo. Ưu tiên phím JIS gốc. */
export function keyForKana(token: string): { code: string; shift: boolean } | undefined {
  for (const k of JIS_KANA_ROWS.flat()) {
    if (k.kana === token) return { code: k.code, shift: false };
    if (k.shiftKana === token) return { code: k.code, shift: true };
  }
  return undefined;
}

const VOICED: Record<string, string> = {
  が: "か", ぎ: "き", ぐ: "く", げ: "け", ご: "こ",
  ざ: "さ", じ: "し", ず: "す", ぜ: "せ", ぞ: "そ",
  だ: "た", ぢ: "ち", づ: "つ", で: "て", ど: "と",
  ば: "は", び: "ひ", ぶ: "ふ", べ: "へ", ぼ: "ほ",
  ゔ: "う",
};
const SEMI_VOICED: Record<string, string> = { ぱ: "は", ぴ: "ひ", ぷ: "ふ", ぺ: "へ", ぽ: "ほ" };

const ON_LAYOUT = new Set(
  JIS_KANA_ROWS.flat().flatMap((k) => [k.kana, k.shiftKana]).filter((x): x is string => !!x),
);

/** Chuỗi token phải gõ cho một kana: が → "か゛", ぱ → "は゜", còn lại là chính nó. */
export function kanaKeysFor(ch: string): string | undefined {
  const h = toHiragana(ch);
  if (VOICED[h]) return VOICED[h] + "゛";
  if (SEMI_VOICED[h]) return SEMI_VOICED[h] + "゜";
  return ON_LAYOUT.has(h) ? h : undefined;
}

export function kanaCandidates(kana: string): Candidate[][] {
  return Array.from(kana, (ch) => {
    const keys = kanaKeysFor(ch);
    return keys ? [{ keys, len: 1 }] : [];
  });
}
