import { describe, expect, it } from "vitest";
import { TypingRun } from "./engine";
import { createFeed, parsePhrase, textsOf, type ContentType, type Phrase } from "./phrases";

/** Bộ sinh số giả ngẫu nhiên có hạt giống, để test lặp lại được. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32;
    return s / 2 ** 32;
  };
}

/** Gõ theo đúng dòng gợi ý cho tới hết câu: phải xong mà không bị từ chối phím nào. */
function typeByGuide(phrase: Phrase, method: "ROMAJI" | "KANA") {
  const run = new TypingRun(phrase.kana, method);
  let misses = 0;
  for (let guard = 0; !run.finished && guard < 500; guard++) {
    const key = run.nextKey();
    if (!key || !run.press(key).ok) misses++;
    if (!key) break;
  }
  return { finished: run.finished, misses };
}

describe("parsePhrase", () => {
  it("tách furigana, bỏ dấu câu khỏi chuỗi phải gõ", () => {
    const p = parsePhrase("{先生|せんせい}、ありがとう。", "");
    expect(p.kana).toBe("せんせいありがとう");
    expect(p.ime).toBe("先生ありがとう");
    expect(p.text).toBe("先生、ありがとう。");
    expect(p.segments[0]).toEqual({ text: "先生", reading: "せんせい", ruby: true, start: 0, imeStart: 0 });
    expect(p.segments[1]).toEqual({ text: "、", reading: "", ruby: false, start: 4, imeStart: 2 });
    expect(p.segments[2]).toEqual({ text: "あ", reading: "あ", ruby: false, start: 4, imeStart: 2 });
  });

  it("hai cụm kanji liền nhau", () => {
    const p = parsePhrase("{明日|あした}{友達|ともだち}に", "");
    expect(p.kana).toBe("あしたともだちに");
    expect(p.segments.map((s) => s.start)).toEqual([0, 3, 7]);
  });
});

const TEXT_TYPES = ["HIRAGANA", "KATAKANA", "MIXED", "KANJI"] as const;

describe("kho câu mẫu", () => {
  for (const content of TEXT_TYPES) {
    describe(content, () => {
      const phrases = textsOf(content);

      it("có đủ câu và không trùng", () => {
        expect(phrases.length).toBeGreaterThanOrEqual(25);
        expect(new Set(phrases.map((p) => p.text)).size).toBe(phrases.length);
      });

      it.each(phrases.map((p) => [p.text, p] as const))("%s — gõ trọn bằng romaji lẫn kana", (_, p) => {
        expect(typeByGuide(p, "ROMAJI")).toEqual({ finished: true, misses: 0 });
        expect(typeByGuide(p, "KANA")).toEqual({ finished: true, misses: 0 });
        expect(p.vi.length).toBeGreaterThan(0);
      });
    });
  }

  it("đúng loại chữ của từng nhóm", () => {
    const hira = /^[ぁ-ゟ]+$/;
    const kata = /^[゠-ヿ]+$/;
    for (const p of textsOf("HIRAGANA")) expect(p.kana, p.text).toMatch(hira);
    for (const p of textsOf("KATAKANA")) expect(p.kana, p.text).toMatch(kata);
    for (const p of textsOf("MIXED")) {
      expect(p.kana, p.text).toMatch(/[ぁ-ゟ]/);
      expect(p.kana, p.text).toMatch(/[ァ-ヺ]/);
    }
    for (const p of textsOf("KANJI")) {
      expect(p.segments.some((s) => s.ruby), p.text).toBe(true);
      for (const s of p.segments.filter((s) => s.ruby)) expect(s.reading, s.text).toMatch(/^[ぁ-ヿ]+$/);
    }
  });
});

describe("createFeed", () => {
  it("không lặp câu cho tới khi dùng hết kho", () => {
    const total = textsOf("HIRAGANA").length;
    const next = createFeed("HIRAGANA", "h", seeded(7));
    const seen = new Set(Array.from({ length: total }, () => next().text));
    expect(seen.size).toBe(total);
  });

  it("không lặp liền một câu khi xáo lại", () => {
    const next = createFeed("KANJI", "h", seeded(3));
    let prev = next().text;
    for (let i = 0; i < 400; i++) {
      const cur = next().text;
      expect(cur).not.toBe(prev);
      prev = cur;
    }
  });

  it.each([["h"], ["k"]] as const)("kana ngẫu nhiên (%s) luôn gõ được", (script) => {
    const next = createFeed("KANA_DRILL" as ContentType, script, seeded(11));
    for (let i = 0; i < 300; i++) {
      const p = next();
      expect(typeByGuide(p, "ROMAJI"), p.text).toEqual({ finished: true, misses: 0 });
      expect(typeByGuide(p, "KANA"), p.text).toEqual({ finished: true, misses: 0 });
    }
  });
});
