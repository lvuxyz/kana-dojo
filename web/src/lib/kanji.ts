import { KANJI } from "@/data/kanji";
import type { CardDraft } from "./space/library";
import { fold } from "./vocabulary";

/* Tra cứu Kanji: tìm theo chữ, âm Hán Việt (gõ không dấu được), nghĩa, âm On/Kun; lọc theo cấp JLPT và bộ thủ;
   ghép âm Hán Việt cho cả một từ. Dữ liệu nét nằm riêng (lib/kanji-strokes.ts) để trang Từ vựng — chỉ cần âm Hán Việt —
   không phải tải thêm ~190 KB nét chữ. */

export interface KanjiEntry {
  c: string;
  /** Âm Hán Việt, viết hoa: "NHẬT". */
  hv: string;
  vi: string;
  jlpt: number;
  on: string[];
  /** Phần sau "." là okurigana: "た.べる". */
  kun: string[];
  /** Bộ thủ (dạng gốc trong 214 bộ Khang Hy). */
  radical: string;
  /** Thành phần chiết tự; rỗng với chữ tượng hình. */
  parts: string[];
  memo: string;
  words: [word: string, reading: string, vi: string][];
}

export { KANJI };

const BY_CHAR = new Map(KANJI.map((k) => [k.c, k]));
export const kanjiOf = (c: string): KanjiEntry | undefined => BY_CHAR.get(c);

/** Tên Hán Việt của các bộ thủ có trong dữ liệu (và vài thành phần hay gặp khi chiết tự). */
export const RADICAL_NAMES: Record<string, string> = {
  一: "NHẤT", 丨: "CỔN", 丿: "PHIỆT", 乙: "ẤT", 二: "NHỊ", 亠: "ĐẦU", 人: "NHÂN", 亻: "NHÂN ĐỨNG", 儿: "NHÂN ĐI", 入: "NHẬP",
  八: "BÁT", 冂: "QUYNH", 冖: "MỊCH", 凵: "KHẢM", 刀: "ĐAO", 刂: "ĐAO", 力: "LỰC", 匕: "CHỦY", 十: "THẬP", 卜: "BỐC",
  又: "HỰU", 口: "KHẨU", 囗: "VI", 土: "THỔ", 夂: "TRUY", 夕: "TỊCH", 大: "ĐẠI", 女: "NỮ", 子: "TỬ", 宀: "MIÊN",
  小: "TIỂU", 山: "SƠN", 巛: "XUYÊN", 工: "CÔNG", 干: "CAN", 幺: "YÊU", 彳: "XÍCH", 斤: "CÂN", 日: "NHẬT", 曰: "VIẾT",
  月: "NGUYỆT", 木: "MỘC", 欠: "KHIẾM", 止: "CHỈ", 毋: "VÔ", 气: "KHÍ", 水: "THỦY", 火: "HỎA", 父: "PHỤ", 玉: "NGỌC",
  王: "VƯƠNG", 生: "SINH", 田: "ĐIỀN", 白: "BẠCH", 目: "MỤC", 示: "KỲ", 礻: "KỲ", 立: "LẬP", 羽: "VŨ", 耳: "NHĨ",
  聿: "DUẬT", 舌: "THIỆT", 艸: "THẢO", 艹: "THẢO", 襾: "Á", 見: "KIẾN", 言: "NGÔN", 足: "TÚC", 車: "XA", 辵: "SƯỚC",
  辶: "SƯỚC", 金: "KIM", 門: "MÔN", 隹: "CHUY", 雨: "VŨ", 食: "THỰC", 飠: "THỰC", 長: "TRƯỜNG", 高: "CAO", 行: "HÀNH", 手: "THỦ",
  // Bộ thủ có thêm từ N4
  丶: "CHỦ", 亅: "QUYẾT", 厶: "KHƯ", 夊: "TUY", 寸: "THỐN", 尸: "THI", 巾: "CÂN", 广: "NGHIỄM", 弓: "CUNG", 匸: "HỆ",
  冫: "BĂNG", 心: "TÂM", 戸: "HỘ", 攴: "PHỘC", 攵: "PHỘC", 文: "VĂN", 斗: "ĐẨU", 方: "PHƯƠNG", 歹: "NGẠT", 氏: "THỊ",
  牛: "NGƯU", 犬: "KHUYỂN", 用: "DỤNG", 疒: "NẠCH", 癶: "BÁT", 矢: "THỈ", 石: "THẠCH", 禾: "HÒA", 穴: "HUYỆT", 竹: "TRÚC",
  糸: "MỊCH", 老: "LÃO", 耂: "LÃO", 肉: "NHỤC", 自: "TỰ", 色: "SẮC", 貝: "BỐI", 赤: "XÍCH", 走: "TẨU", 邑: "ẤP",
  阜: "PHỤ", 阝: "PHỤ", 里: "LÝ", 青: "THANH", 音: "ÂM", 頁: "HIỆT", 風: "PHONG", 首: "THỦ", 馬: "MÃ", 魚: "NGƯ",
  鳥: "ĐIỂU", 黒: "HẮC", 士: "SĨ",
  // Thành phần hay gặp khi chiết tự
  氵: "THỦY", 扌: "THỦ", 灬: "HỎA", 罒: "VÕNG", 虫: "TRÙNG", 几: "KỶ", 豆: "ĐẬU", 羊: "DƯƠNG", 己: "KỶ", 彐: "KỆ",
  米: "MỄ", 豕: "THỈ", 厂: "HÁN", 卩: "TIẾT", 夫: "PHU", 未: "VỊ", 央: "ƯƠNG", 至: "CHÍ", 尺: "XÍCH", 弋: "DẶC",
  勿: "VẬT", 反: "PHẢN", 占: "CHIÊM", 官: "QUAN", 完: "HOÀN", 介: "GIỚI", 式: "THỨC", 是: "THỊ", 軍: "QUÂN", 昔: "TÍCH",
  免: "MIỄN", 孝: "HIẾU", 良: "LƯƠNG", 可: "KHẢ", 交: "GIAO", 化: "HÓA", 周: "CHU", 吾: "NGÔ", 云: "VÂN", 也: "DÃ",
  予: "DƯ", 艮: "CẤN", 丙: "BÍNH", 丁: "ĐINH", 亜: "Á", 与: "DỮ", 吏: "LẠI", 哥: "CA", 彦: "NGẠN", 昜: "DƯƠNG",
};

/** Các cấp JLPT có chữ, dễ trước (N5, N4…). */
export const KANJI_LEVELS = [...new Set(KANJI.map((k) => k.jlpt))].sort((a, b) => b - a);

/** Bộ thủ của một cấp, xếp theo số chữ dùng bộ đó (nhiều trước) — chỉ những bộ thực sự có chữ để lọc. */
export function radicalsOf(level: number): { radical: string; name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const k of KANJI) if (k.jlpt === level) counts.set(k.radical, (counts.get(k.radical) ?? 0) + 1);
  return [...counts]
    .map(([radical, count]) => ({ radical, name: RADICAL_NAMES[radical] ?? "", count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "vi"));
}

/** Okurigana bỏ dấu chấm để tìm: "た.べる" → "たべる". */
const plainKun = (k: string) => k.replace(".", "");

const SEARCHABLE = KANJI.map((k) => ({
  k,
  hv: fold(k.hv),
  text: fold([k.c, k.vi, ...k.on, ...k.kun.map(plainKun), ...k.words.flatMap(([w, r]) => [w, r])].join("\n")),
}));

/** Chữ khớp từ khoá trong một cấp (và một bộ thủ nếu có).
 *  Âm Hán Việt được ưu tiên và so cả TỪNG TỪ: gõ "nhat ban" ra 日 và 本, gõ "nhat" thì 日 và 一 (NHẤT) đứng đầu
 *  trước các chữ chỉ có "nhat" trong nghĩa hay từ ví dụ. Gõ thẳng chữ Hán (kể cả dán cả một từ) ra từng chữ trong đó. */
export function searchKanji(level: number | null, query: string, radical: string | null = null): KanjiEntry[] {
  const pool = SEARCHABLE.filter(({ k }) => (level === null || k.jlpt === level) && (!radical || k.radical === radical));
  const raw = query.trim();
  if (!raw) return pool.map((x) => x.k);

  const typed = [...raw].filter((ch) => BY_CHAR.has(ch));
  if (typed.length > 0) {
    const set = new Set(typed);
    return pool.filter(({ k }) => set.has(k.c)).sort((a, b) => typed.indexOf(a.k.c) - typed.indexOf(b.k.c)).map((x) => x.k);
  }

  const needle = fold(raw);
  const tokens = needle.split(/\s+/).filter(Boolean);
  const rank = ({ hv, text }: (typeof SEARCHABLE)[number]): number => {
    if (tokens.some((t) => hv === t)) return 0;
    if (tokens.some((t) => hv.startsWith(t))) return 1;
    if (text.includes(needle)) return 2;
    return -1;
  };
  return pool
    .map((x) => ({ x, r: rank(x) }))
    .filter(({ r }) => r >= 0)
    .sort((a, b) => a.r - b.r)
    .map(({ x }) => x.k);
}

const isKanji = (ch: string) => /\p{Script=Han}/u.test(ch);

/** Âm Hán Việt của một từ, ghép từ các chữ có trong dữ liệu: "日本語" → "NHẬT BẢN NGỮ", "食べる" → "THỰC" (kana bỏ qua).
 *  Chỉ cần một chữ Hán CHƯA có trong dữ liệu là cả từ trả về null — thà không hiện còn hơn hiện nửa vời. */
export function hanVietOf(word: string): string | null {
  const parts: string[] = [];
  for (const ch of word) {
    if (ch === "々") {
      if (parts.length === 0) return null;
      parts.push(parts[parts.length - 1]);
      continue;
    }
    if (!isKanji(ch)) continue;
    const k = BY_CHAR.get(ch);
    if (!k) return null;
    parts.push(k.hv);
  }
  return parts.length ? parts.join(" ") : null;
}

/** Các chữ Hán trong một từ có trang chi tiết, theo thứ tự xuất hiện, không lặp. */
export const kanjiInWord = (word: string): KanjiEntry[] =>
  [...new Set(word)].map((ch) => BY_CHAR.get(ch)).filter((k): k is KanjiEntry => !!k);

/** Hiển thị âm Kun: "た.べる" → "た(べる)" — phần okurigana trong ngoặc như từ điển giấy. */
export const kunLabel = (k: string) => (k.includes(".") ? k.replace(/\.(.+)$/, "($1)") : k);

/** Một chữ thành một thẻ trong bộ thẻ của người học: hỏi chữ, đáp âm Hán Việt + nghĩa, gợi ý là âm đọc. */
export const kanjiToDraft = (k: KanjiEntry): CardDraft => ({
  front: k.c,
  back: `${k.hv} — ${k.vi}`,
  hint: [k.on.join("・"), k.kun.map(plainKun).join("・")].filter(Boolean).join(" / "),
});
