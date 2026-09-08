import raw from "@/data/kana-data.json";

export type Script = "h" | "k";
export type KanaGroup = "basic" | "dakuten" | "yoon";

export interface KanaChar {
  /** Ký tự hiển thị: "あ" hoặc "きゃ" (âm ghép gồm 2 glyph) */
  c: string;
  /** Romaji Hepburn */
  r: string;
  /** Gợi ý đọc gần đúng cho người Việt */
  vn: string;
  s: Script;
  g: KanaGroup;
  /** Khoá hàng trong bảng ngũ thập âm: "a", "ka", "kya"… */
  row: string;
  col: number;
  /** Tổng số nét của mọi glyph thành phần */
  n: number;
}

export interface KanaData {
  viewBox: number;
  rowLabels: Record<string, string>;
  glyphs: Record<string, string[]>;
  chars: KanaChar[];
}

export const KANA = raw as KanaData;
export const VIEW_BOX = KANA.viewBox;

/** Dữ liệu nét là hằng số bất biến nên đóng gói thẳng vào bundle thay vì gọi API:
 *  57 KB (≈20 KB sau gzip), đổi lại mất hẳn một điểm hỏng và một vòng round-trip. */
export function strokesOf(char: string): { glyph: string; paths: string[] }[] {
  return Array.from(char).map((g) => ({ glyph: g, paths: KANA.glyphs[g] ?? [] }));
}

export function charsOf(script: Script, group: KanaGroup | "all"): KanaChar[] {
  return KANA.chars.filter((c) => c.s === script && (group === "all" || c.g === group));
}

export interface KanaRow {
  row: string;
  group: KanaGroup;
  label: string;
  cols: number;
  /** Ô trống ở vị trí các âm không tồn tại (や行, わ行) được giữ nguyên như bảng gốc */
  slots: (KanaChar | null)[];
}

export function rowsOf(list: KanaChar[]): KanaRow[] {
  const order: KanaRow[] = [];
  const index = new Map<string, KanaChar[]>();

  for (const c of list) {
    if (!index.has(c.row)) {
      index.set(c.row, []);
      order.push({ row: c.row, group: c.g, label: KANA.rowLabels[c.row] ?? c.row, cols: 0, slots: [] });
    }
    index.get(c.row)!.push(c);
  }

  for (const r of order) {
    const cells = index.get(r.row)!;
    r.cols = r.group === "yoon" ? 3 : Math.max(1, ...cells.map((c) => c.col + 1));
    r.slots = Array.from({ length: r.cols }, () => null);
    for (const c of cells) r.slots[c.col] = c;
  }
  return order;
}

export const GROUP_LABEL: Record<KanaGroup, string> = {
  basic: "Cơ bản · 46 âm",
  dakuten: "Biến âm · dakuten & handakuten",
  yoon: "Âm ghép · yōon",
};

export const SCRIPT_LABEL: Record<Script, string> = { h: "ひらがな", k: "カタカナ" };
