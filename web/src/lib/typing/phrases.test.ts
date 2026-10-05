import { describe, expect, it } from "vitest";
import { TypingRun } from "./engine";
import { KANA } from "@/lib/kana";
import { createFeed, parsePhrase, textsOf, userPhrases, validateTypingText, type FeedOptions, type Phrase } from "./phrases";

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

const ALL: FeedOptions = { drillScript: "h", drillGroup: "all" };

describe("createFeed", () => {
  it("không lặp câu cho tới khi dùng hết kho", () => {
    const total = textsOf("HIRAGANA").length;
    const next = createFeed("HIRAGANA", ALL, seeded(7));
    const seen = new Set(Array.from({ length: total }, () => next().text));
    expect(seen.size).toBe(total);
  });

  it("không lặp liền một câu khi xáo lại", () => {
    const next = createFeed("KANJI", ALL, seeded(3));
    let prev = next().text;
    for (let i = 0; i < 400; i++) {
      const cur = next().text;
      expect(cur).not.toBe(prev);
      prev = cur;
    }
  });

  it.each([["h"], ["k"]] as const)("kana ngẫu nhiên (%s) luôn gõ được", (script) => {
    const next = createFeed("KANA_DRILL", { drillScript: script, drillGroup: "all" }, seeded(11));
    for (let i = 0; i < 300; i++) {
      const p = next();
      expect(typeByGuide(p, "ROMAJI"), p.text).toEqual({ finished: true, misses: 0 });
      expect(typeByGuide(p, "KANA"), p.text).toEqual({ finished: true, misses: 0 });
    }
  });
});

describe("createFeed — nhóm kana, chữ hay sai, câu cố định", () => {
  it("kana ngẫu nhiên chỉ lấy đúng nhóm đã chọn", () => {
    const basic = new Set(KANA.chars.filter((c) => c.s === "k" && c.g === "basic").map((c) => c.c));
    const next = createFeed("KANA_DRILL", { drillScript: "k", drillGroup: "basic" }, seeded(5));
    for (let i = 0; i < 100; i++) {
      for (const seg of next().segments) if (seg.reading) expect(basic.has(seg.text), seg.text).toBe(true);
    }
  });

  it("chữ hay sai: chỉ rút từ danh sách yếu, chữ yếu hơn xuất hiện nhiều hơn", () => {
    const next = createFeed("WEAK", { ...ALL, weak: [["ぢ", 9], ["しゃ", 1]] }, seeded(9));
    const count = new Map<string, number>();
    for (let i = 0; i < 200; i++) {
      const p = next();
      expect(typeByGuide(p, "ROMAJI")).toEqual({ finished: true, misses: 0 });
      for (const chunk of p.text.split(" ")) count.set(chunk, (count.get(chunk) ?? 0) + 1);
    }
    expect([...count.keys()].sort()).toEqual(["しゃ", "ぢ"]);
    // Trọng số căn bậc hai: 9 lần sai so với 1 lần → khoảng 3:1.
    const ratio = count.get("ぢ")! / count.get("しゃ")!;
    expect(ratio).toBeGreaterThan(2);
    expect(ratio).toBeLessThan(4.5);
  });

  it("chữ hay sai: bỏ mục không gõ được, chưa có dữ liệu thì dùng kana ngẫu nhiên", () => {
    const onlyKanji = createFeed("WEAK", { ...ALL, weak: [["駅", 3]] }, seeded(1));
    expect(onlyKanji().text).not.toContain("駅");
    const empty = createFeed("WEAK", { drillScript: "h", drillGroup: "basic" }, seeded(1));
    expect(empty().kana.length).toBeGreaterThan(0);
  });

  it("danh sách câu cố định được gõ lần lượt rồi quay lại đầu", () => {
    const list = textsOf("HIRAGANA").slice(0, 3);
    const next = createFeed("HIRAGANA", { ...ALL, phrases: list }, seeded(2));
    expect([next(), next(), next(), next()].map((p) => p.text)).toEqual([...list, list[0]].map((p) => p.text));
  });
});

describe("câu tự soạn (nội dung MINE)", () => {
  const opts = (mine: Phrase[]): FeedOptions => ({ drillScript: "h", drillGroup: "basic", mine });

  it("validateTypingText: nhận câu gõ được, từ chối câu sẽ làm kẹt ván", () => {
    for (const ok of ["こんにちは", "{私|わたし}は{学生|がくせい}です。", "コーヒーをください", "  ありがとう  "]) {
      expect(validateTypingText(ok)).toBeNull();
    }
    expect(validateTypingText("")).toMatch(/trống/);
    expect(validateTypingText("   ")).toMatch(/trống/);
    expect(validateTypingText("私は")).toMatch(/Kanji phải viết kèm cách đọc/);
    expect(validateTypingText("hello")).toMatch(/không gõ được/);
    expect(validateTypingText("{私|watashi}")).toMatch(/Cách đọc/);
    expect(validateTypingText("、。")).toMatch(/không có chữ nào/);
  });

  it("mọi câu mà validateTypingText nhận đều gõ trọn được bằng cả romaji lẫn kana (không có câu 'hợp lệ nhưng kẹt')", () => {
    for (const src of ["こんにちは", "{水|みず}をください", "ファイル、ティー。", "きょうは{天気|てんき}がいい"]) {
      expect(validateTypingText(src)).toBeNull();
      const p = parsePhrase(src, "");
      expect(typeByGuide(p, "ROMAJI")).toEqual({ finished: true, misses: 0 });
      expect(typeByGuide(p, "KANA")).toEqual({ finished: true, misses: 0 });
    }
  });

  it("userPhrases lọc câu không gõ được (tệp sao lưu sửa tay không làm kẹt ván) và cắt khoảng trắng", () => {
    const list = userPhrases([
      { text: " ありがとう ", vi: "Cảm ơn" },
      { text: "abc", vi: "" },
      { text: "{水|みず}", vi: "nước" },
    ]);
    expect(list.map((p) => p.text)).toEqual(["ありがとう", "水"]);
    expect(list[0].vi).toBe("Cảm ơn");
  });

  it("MINE chỉ ra câu của người học, xáo trộn, không lặp cho tới khi dùng hết", () => {
    const mine = userPhrases([{ text: "あ", vi: "" }, { text: "い", vi: "" }, { text: "う", vi: "" }]);
    const feed = createFeed("MINE", opts(mine), seeded(7));
    const firstRound = Array.from({ length: 3 }, () => feed().text);
    expect([...firstRound].sort()).toEqual(["あ", "い", "う"]);
  });

  it("chưa có câu nào thì dùng kana ngẫu nhiên thay vì kẹt", () => {
    const feed = createFeed("MINE", opts([]), seeded(1));
    const p = feed();
    expect(p.kana.length).toBeGreaterThan(0);
    expect(typeByGuide(p, "ROMAJI").finished).toBe(true);
  });
});
