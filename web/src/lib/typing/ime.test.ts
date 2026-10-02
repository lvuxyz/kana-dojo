import { describe, expect, it } from "vitest";
import { compareIme, imeProgress, normalizeIme } from "./ime";
import { parsePhrase } from "./phrases";

describe("normalizeIme", () => {
  it("bỏ dấu câu, khoảng trắng (cả full-width) và gộp chữ half-width", () => {
    expect(normalizeIme("先生、ありがとう。")).toBe("先生ありがとう");
    expect(normalizeIme("コーヒー　を ください！")).toBe("コーヒーをください");
    expect(normalizeIme("ｺｰﾋｰ")).toBe("コーヒー");
  });
});

describe("compareIme", () => {
  it("đếm phần đầu khớp và phát hiện chữ sai hoặc thừa", () => {
    expect(compareIme("日本語", "日本語を")).toEqual({ matched: 3, wrong: false });
    expect(compareIme("日本後", "日本語を")).toEqual({ matched: 2, wrong: true });
    expect(compareIme("日本語をx", "日本語を")).toEqual({ matched: 4, wrong: true });
    expect(compareIme("", "日本語を")).toEqual({ matched: 0, wrong: false });
  });
});

describe("imeProgress", () => {
  const p = parsePhrase("{日本語|にほんご}を{勉強|べんきょう}しています", "");

  it("quy đổi phần đã khớp ra số phím romaji tối thiểu", () => {
    expect(imeProgress(p, 0)).toEqual({ keys: 0, chars: 0 });
    // にほんご = "nihongo"
    expect(imeProgress(p, 3)).toEqual({ keys: 7, chars: 4 });
    // にほんごを = "nihongowo"
    expect(imeProgress(p, 4)).toEqual({ keys: 9, chars: 5 });
  });

  it("cụm kanji chỉ tính khi đã đổi trọn cụm", () => {
    expect(imeProgress(p, 5)).toEqual(imeProgress(p, 4));
    expect(imeProgress(p, p.ime.length).chars).toBe(p.kana.length);
  });
});
