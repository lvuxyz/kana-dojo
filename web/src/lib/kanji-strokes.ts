import raw from "@/data/kanji-strokes.json";

/* Nét chữ Kanji (KanjiVG, CC BY-SA 3.0), cùng hệ toạ độ 109 với kana nên StrokeStage dùng thẳng được.
   Tách khỏi lib/kanji.ts: chỉ trang Kanji cần tới ~50 KB này. */

const DATA = raw as { license: string; viewBox: number; strokes: Record<string, string[]> };

export const KANJI_STROKES_LICENSE = DATA.license;

/** Nét của một chữ theo đúng thứ tự viết; rỗng nếu chưa có dữ liệu. */
export const kanjiStrokes = (c: string): string[] => DATA.strokes[c] ?? [];

/** Số nét — lấy từ dữ liệu nét, không ghi tay ở đâu khác. */
export const strokeCount = (c: string): number => kanjiStrokes(c).length;

/** Dạng StrokeStage cần (mỗi glyph một mảng nét). */
export const stageStrokes = (c: string) => [{ glyph: c, paths: kanjiStrokes(c) }];

export const hasStrokes = (c: string): boolean => c in DATA.strokes;
