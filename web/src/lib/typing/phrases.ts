import {
  HIRAGANA_TEXTS,
  KANJI_TEXTS,
  KATAKANA_TEXTS,
  MIXED_TEXTS,
  type TextEntry,
} from "@/data/typing-texts";
import { KANA, type Script } from "@/lib/kana";
import { isSkipped } from "./romaji";

export type ContentType = "HIRAGANA" | "KATAKANA" | "MIXED" | "KANJI" | "KANA_DRILL";

export const CONTENT_INFO: Record<ContentType, { ja: string; label: string; hint: string }> = {
  HIRAGANA: { ja: "ひらがな", label: "Hiragana", hint: "Câu chào hỏi, câu đơn giản" },
  KATAKANA: { ja: "カタカナ", label: "Katakana", hint: "Từ ngoại lai — có cả ファ, ティ, ウィ…" },
  MIXED: { ja: "ひら＋カタ", label: "Hỗn hợp", hint: "Câu có cả hiragana lẫn katakana" },
  KANJI: { ja: "漢字", label: "Kanji có furigana", hint: "Đọc câu có kanji, gõ theo cách đọc" },
  KANA_DRILL: { ja: "五十音", label: "Kana ngẫu nhiên", hint: "Chuỗi chữ rời để làm quen phím" },
};

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

const TEXTS: Record<Exclude<ContentType, "KANA_DRILL">, TextEntry[]> = {
  HIRAGANA: HIRAGANA_TEXTS,
  KATAKANA: KATAKANA_TEXTS,
  MIXED: MIXED_TEXTS,
  KANJI: KANJI_TEXTS,
};

export function textsOf(content: Exclude<ContentType, "KANA_DRILL">): Phrase[] {
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

/** Một chuỗi kana rời, cách nhau bằng khoảng trắng (chỉ để dễ nhìn — khoảng trắng không phải gõ). */
function drillPhrase(script: Script, rng: () => number): Phrase {
  const pool = KANA.chars.filter((c) => c.s === script);
  const picked = Array.from({ length: DRILL_LENGTH }, () => pool[Math.floor(rng() * pool.length)].c);
  return parsePhrase(picked.join(" "), "");
}

/**
 * Nguồn câu vô tận: xáo trộn cả kho, hết thì xáo lại — không lặp câu cho tới khi đã dùng hết,
 * và không để câu cuối lượt trước trùng câu đầu lượt sau.
 */
export function createFeed(content: ContentType, drillScript: Script, rng: () => number = Math.random): () => Phrase {
  if (content === "KANA_DRILL") return () => drillPhrase(drillScript, rng);

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
