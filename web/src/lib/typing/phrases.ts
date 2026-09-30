import {
  HIRAGANA_TEXTS,
  KANJI_TEXTS,
  KATAKANA_TEXTS,
  MIXED_TEXTS,
  type TextEntry,
} from "@/data/typing-texts";
import { KANA, type KanaGroup, type Script } from "@/lib/kana";
import { isSkipped, isTypeable } from "./romaji";

export type ContentType = "HIRAGANA" | "KATAKANA" | "MIXED" | "KANJI" | "KANA_DRILL" | "WEAK";

export const CONTENT_INFO: Record<ContentType, { ja: string; label: string; hint: string }> = {
  HIRAGANA: { ja: "ひらがな", label: "Hiragana", hint: "Câu chào hỏi, câu đơn giản" },
  KATAKANA: { ja: "カタカナ", label: "Katakana", hint: "Từ ngoại lai — có cả ファ, ティ, ウィ…" },
  MIXED: { ja: "ひら＋カタ", label: "Hỗn hợp", hint: "Câu có cả hiragana lẫn katakana" },
  KANJI: { ja: "漢字", label: "Kanji có furigana", hint: "Đọc câu có kanji, gõ theo cách đọc" },
  KANA_DRILL: { ja: "五十音", label: "Kana ngẫu nhiên", hint: "Chuỗi chữ rời để làm quen phím" },
  WEAK: { ja: "苦手", label: "Chữ hay sai", hint: "Luyện lại đúng những chữ bạn hay gõ sai" },
};

/** Nhóm chữ cho bài kana ngẫu nhiên — người mới chỉ nên gặp 46 chữ cơ bản. */
export type DrillGroup = KanaGroup | "all";

export const DRILL_GROUPS: { value: DrillGroup; label: string }[] = [
  { value: "basic", label: "Cơ bản" },
  { value: "dakuten", label: "Biến âm" },
  { value: "yoon", label: "Âm ghép" },
  { value: "all", label: "Tất cả" },
];

export interface Segment {
  /** Chữ hiển thị: một kana, một dấu câu, hoặc cả cụm kanji */
  text: string;
  /** Kana phải gõ; rỗng với dấu câu */
  reading: string;
  /** Cụm kanji có furigana */
  ruby: boolean;
  /** Vị trí bắt đầu của reading trong Phrase.kana */
  start: number;
  /** Vị trí bắt đầu của text trong Phrase.ime */
  imeStart: number;
}

export interface Phrase {
  segments: Segment[];
  /** Chuỗi kana phải gõ ở chế độ romaji/kana (không có dấu câu) */
  kana: string;
  /** Chuỗi phải ra được ở chế độ IME: chữ hiển thị (kể cả kanji), không có dấu câu */
  ime: string;
  /** Văn bản gốc để hiển thị và đọc thành tiếng */
  text: string;
  vi: string;
}

const RUBY = /\{([^|}]+)\|([^}]+)\}/g;

/** "{日本語|にほんご}を…" → các đoạn hiển thị kèm chỉ số để tô sáng khi gõ. */
export function parsePhrase(src: string, vi: string): Phrase {
  const segments: Segment[] = [];
  let kana = "";
  let ime = "";
  let text = "";

  const plain = (s: string) => {
    for (const ch of s) {
      const skip = isSkipped(ch);
      segments.push({ text: ch, reading: skip ? "" : ch, ruby: false, start: kana.length, imeStart: ime.length });
      text += ch;
      if (!skip) {
        kana += ch;
        ime += ch;
      }
    }
  };

  let last = 0;
  for (const m of src.matchAll(RUBY)) {
    plain(src.slice(last, m.index));
    segments.push({ text: m[1], reading: m[2], ruby: true, start: kana.length, imeStart: ime.length });
    kana += m[2];
    ime += m[1];
    text += m[1];
    last = m.index + m[0].length;
  }
  plain(src.slice(last));

  return { segments, kana, ime, text, vi };
}

type TextContent = Exclude<ContentType, "KANA_DRILL" | "WEAK">;

const TEXTS: Record<TextContent, TextEntry[]> = {
  HIRAGANA: HIRAGANA_TEXTS,
  KATAKANA: KATAKANA_TEXTS,
  MIXED: MIXED_TEXTS,
  KANJI: KANJI_TEXTS,
};

export function textsOf(content: TextContent): Phrase[] {
  return TEXTS[content].map((e) => parsePhrase(e.t, e.vi));
}

function shuffle<T>(list: T[], rng: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const DRILL_LENGTH = 5;

/** Chuỗi kana rời cách nhau bằng khoảng trắng (chỉ để dễ nhìn — khoảng trắng không phải gõ). */
function chunksPhrase(chunks: string[]): Phrase {
  return parsePhrase(chunks.join(" "), "");
}

function drillPhrase(script: Script, group: DrillGroup, rng: () => number): Phrase {
  const pool = KANA.chars.filter((c) => c.s === script && (group === "all" || c.g === group));
  return chunksPhrase(Array.from({ length: DRILL_LENGTH }, () => pool[Math.floor(rng() * pool.length)].c));
}

/**
 * Rút có trọng số theo căn bậc hai số lần sai: chữ sai nhiều vẫn xuất hiện nhiều hơn, nhưng một chữ
 * sai vượt trội không chiếm trọn câu (sai 9 lần so với 1 lần → tỉ lệ 3:1 thay vì 9:1).
 */
function weakPhrase(weak: [string, number][], rng: () => number): Phrase {
  const weights = weak.map(([kana, w]) => [kana, Math.sqrt(w)] as const);
  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  const pick = () => {
    let r = rng() * total;
    for (const [kana, w] of weights) {
      r -= w;
      if (r < 0) return kana;
    }
    return weights[weights.length - 1][0];
  };
  return chunksPhrase(Array.from({ length: DRILL_LENGTH }, pick));
}

export interface FeedOptions {
  drillScript: Script;
  drillGroup: DrillGroup;
  /** Chữ hay sai và trọng số, cho nội dung WEAK */
  weak?: [string, number][];
  /** Danh sách câu cố định (luyện lại các câu có lỗi) — gõ lần lượt, hết thì quay lại đầu */
  phrases?: Phrase[];
}

/**
 * Nguồn câu vô tận. Kho câu mẫu: xáo trộn, hết thì xáo lại — không lặp câu cho tới khi đã dùng hết
 * và không để câu cuối lượt trước trùng câu đầu lượt sau. "Chữ hay sai" chưa có dữ liệu thì
 * dùng kana ngẫu nhiên.
 */
export function createFeed(content: ContentType, opts: FeedOptions, rng: () => number = Math.random): () => Phrase {
  if (opts.phrases && opts.phrases.length > 0) {
    const list = opts.phrases;
    let i = 0;
    return () => list[i++ % list.length];
  }
  if (content === "WEAK") {
    const weak = (opts.weak ?? []).filter(([kana, w]) => w > 0 && Array.from(kana).every(isTypeable));
    if (weak.length > 0) return () => weakPhrase(weak, rng);
  }
  if (content === "KANA_DRILL" || content === "WEAK") return () => drillPhrase(opts.drillScript, opts.drillGroup, rng);

  const all = textsOf(content);
  let queue: Phrase[] = [];
  let previous: Phrase | undefined;
  return () => {
    if (queue.length === 0) {
      queue = shuffle(all, rng);
      if (queue.length > 1 && queue[0] === previous) queue.push(queue.shift()!);
    }
    previous = queue.shift()!;
    return previous;
  };
}
