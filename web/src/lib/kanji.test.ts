import { describe, expect, it } from "vitest";
import { VOCABULARY } from "@/data/vocabulary";
import {
  KANJI, KANJI_LEVELS, RADICAL_NAMES, hanVietOf, kanjiInWord, kanjiOf, kanjiToDraft, kunLabel, radicalsOf, searchKanji,
} from "./kanji";
import { hasStrokes, strokeCount } from "./kanji-strokes";

describe("dữ liệu kanji", () => {
  it("mỗi chữ xuất hiện đúng một lần và có dữ liệu nét", () => {
    const chars = KANJI.map((k) => k.c);
    expect(new Set(chars).size).toBe(chars.length);
    for (const c of chars) expect(hasStrokes(c), c).toBe(true);
  });

  it("đủ trường cần hiển thị, bộ thủ có tên, ví dụ thật sự chứa chữ", () => {
    for (const k of KANJI) {
      expect(k.hv, k.c).toMatch(/^[A-ZÀ-Ỹ]+$/u);
      expect(k.vi.length, k.c).toBeGreaterThan(0);
      expect(k.on.length + k.kun.length, k.c).toBeGreaterThan(0);
      expect(RADICAL_NAMES[k.radical], `bộ ${k.radical} của ${k.c}`).toBeTruthy();
      expect(k.words.length, k.c).toBeGreaterThan(0);
      for (const [w] of k.words) expect(w, k.c).toContain(k.c);
      for (const r of k.on) expect(r, k.c).toMatch(/^[\p{Script=Katakana}ー]+$/u);
      for (const r of k.kun) expect(r, k.c).toMatch(/^[\p{Script=Hiragana}.]+$/u);
    }
  });

  it("mọi thành phần chiết tự là chữ có trong dữ liệu hoặc có tên Hán Việt", () => {
    // Các nét không có một âm Hán Việt chuẩn, cố ý để trống tên (xem RADICAL_NAMES).
    const unnamed = new Set(["䒑", "𠂉", "メ", "⺍"]);
    for (const k of KANJI)
      for (const p of k.parts) if (!unnamed.has(p)) expect(kanjiOf(p)?.hv ?? RADICAL_NAMES[p], `${p} trong ${k.c}`).toBeTruthy();
  });

  it("số nét lấy từ KanjiVG", () => {
    expect(strokeCount("一")).toBe(1);
    expect(strokeCount("日")).toBe(4);
    expect(strokeCount("曜")).toBe(18);
  });
});

describe("searchKanji", () => {
  const chars = (list: { c: string }[]) => list.map((k) => k.c);

  it("không có từ khoá thì trả cả cấp", () => {
    expect(searchKanji(5, "")).toHaveLength(KANJI.filter((k) => k.jlpt === 5).length);
    expect(KANJI_LEVELS).toContain(5);
  });

  it("gõ âm Hán Việt không dấu, chữ khớp đúng âm đứng đầu", () => {
    expect(chars(searchKanji(5, "nhat")).slice(0, 2).sort()).toEqual(["一", "日"].sort());
    expect(chars(searchKanji(5, "NHẬT"))).toContain("日");
    // "ban" không dấu là cả BẢN (本) lẫn BÁN (半): cả hai đều đứng trước các chữ chỉ khớp trong nghĩa.
    expect(chars(searchKanji(5, "nhat ban")).slice(0, 4)).toEqual(expect.arrayContaining(["日", "本", "半"]));
  });

  it("tìm được theo nghĩa, âm On và âm Kun (bỏ dấu chấm okurigana)", () => {
    expect(chars(searchKanji(5, "mua"))).toContain("雨");
    expect(chars(searchKanji(5, "ニチ"))).toContain("日");
    expect(chars(searchKanji(5, "たべる"))).toContain("食");
  });

  it("âm On/Kun phân biệt dấu đục: ゴ không ra chữ đọc コ", () => {
    const go = chars(searchKanji(5, "ゴ"));
    expect(go).toEqual(expect.arrayContaining(["五", "午", "後", "語"]));
    for (const c of ["今", "金", "口", "校", "国", "高", "古"]) expect(go, c).not.toContain(c);
    expect(chars(searchKanji(5, "デン"))).not.toContain("天");
  });

  it("dán một từ tiếng Nhật ra từng chữ theo thứ tự", () => {
    expect(chars(searchKanji(null, "日本語"))).toEqual(["日", "本", "語"]);
  });

  it("lọc theo bộ thủ", () => {
    const list = searchKanji(5, "", "言");
    expect(list.length).toBeGreaterThan(2);
    for (const k of list) expect(k.radical).toBe("言");
    expect(radicalsOf(5)[0].count).toBeGreaterThanOrEqual(radicalsOf(5)[1].count);
  });
});

describe("hanVietOf", () => {
  it("ghép âm từng chữ, bỏ qua kana, lặp lại với 々", () => {
    expect(hanVietOf("日本語")).toBe("NHẬT BẢN NGỮ");
    expect(hanVietOf("食べる")).toBe("THỰC");
    expect(hanVietOf("時々")).toBe("THỜI THỜI");
  });

  it("có chữ Hán chưa có dữ liệu hoặc không có chữ Hán thì null", () => {
    expect(hanVietOf("辞書")).toBeNull();
    expect(hanVietOf("あなた")).toBeNull();
  });

  it("phần lớn từ vựng N5 có chữ Hán ghép được âm", () => {
    const withKanji = VOCABULARY.filter((v) => /\p{Script=Han}/u.test(v.word));
    const ok = withKanji.filter((v) => hanVietOf(v.word));
    expect(ok.length / withKanji.length).toBeGreaterThan(0.3);
  });
});

describe("tiện ích", () => {
  it("kanjiInWord bỏ trùng và chữ chưa có", () => {
    expect(kanjiInWord("日曜日").map((k) => k.c)).toEqual(["日", "曜"]);
    expect(kanjiInWord("辞書").map((k) => k.c)).toEqual(["書"]);
  });

  it("kunLabel đặt okurigana trong ngoặc", () => {
    expect(kunLabel("た.べる")).toBe("た(べる)");
    expect(kunLabel("ひと")).toBe("ひと");
  });

  it("kanjiToDraft tạo thẻ chữ → âm Hán Việt + nghĩa", () => {
    const d = kanjiToDraft(kanjiOf("食")!);
    expect(d).toEqual({ front: "食", back: "THỰC — ăn", hint: "ショク / たべる" });
  });
});
