import { describe, expect, it } from "vitest";
import { LIMITS } from "@/lib/space/space";
import { decodeTextFile, importLinesToText, parseTypingImport, splitSentences } from "./import";

describe("tách câu", () => {
  it("tách sau 。！？, giữ dấu đóng ngoặc đi kèm câu", () => {
    expect(splitSentences("おはよう。げんき？「はい！」そうです")).toEqual(["おはよう。", "げんき？", "「はい！」", "そうです"]);
    expect(splitSentences("えっ!?ほんとう…")).toEqual(["えっ!?", "ほんとう…"]);
  });

  it("không cắt giữa cụm {漢字|かんじ}", () => {
    expect(splitSentences("{今日|きょう}は{晴|は}れ。{明日|あした}も")).toEqual(["{今日|きょう}は{晴|は}れ。", "{明日|あした}も"]);
  });
});

describe("nhập văn bản", () => {
  it("đoạn dài không có nghĩa → từng câu; bỏ dòng trống, dòng #, câu trùng", () => {
    const lines = parseTypingImport("\ufeff# bài 1\nおはよう。こんにちは！\n\nおはよう。\n");
    expect(lines.map((l) => l.text)).toEqual(["おはよう。", "こんにちは！"]);
    expect(lines.every((l) => l.reason === null && l.vi === "")).toBe(true);
  });

  it("dòng có nghĩa (Tab hoặc | ngoài cụm kanji) giữ nguyên một câu", () => {
    const lines = parseTypingImport("{水|みず}をください | Cho tôi nước\nありがとう。どうも\tCảm ơn\tnhiều");
    expect(lines).toEqual([
      { text: "{水|みず}をください", vi: "Cho tôi nước", reason: null },
      { text: "ありがとう。どうも", vi: "Cảm ơn nhiều", reason: null },
    ]);
  });

  it("câu không gõ được có lý do; câu quá dài bị chặn", () => {
    const [bare, latin, long] = parseTypingImport(`水をください\nhello\n${"あ".repeat(LIMITS.text + 1)}`);
    expect(bare.reason).toBe("Kanji “水” chưa có cách đọc — viết {水|…}");
    expect(latin.reason).toMatch(/không gõ được/);
    expect(long.reason).toMatch(/dài hơn/);
  });

  it("katakana nửa độ rộng được đổi về katakana thường", () => {
    const [l] = parseTypingImport("ｺｰﾋｰ");
    expect(l).toMatchObject({ text: "コーヒー", reason: null });
  });

  it("câu cần sửa viết lại được thành văn bản và đọc lại y hệt", () => {
    const bad = parseTypingImport("水 | nước\n火");
    expect(importLinesToText(bad)).toBe("水 | nước\n火");
    expect(parseTypingImport(importLinesToText(bad))).toEqual(bad);
  });
});

describe("đọc tệp", () => {
  it("UTF-8, nếu không hợp lệ thì Shift_JIS", () => {
    expect(decodeTextFile(new TextEncoder().encode("こんにちは"))).toBe("こんにちは");
    const sjis = new Uint8Array([0x82, 0xa0, 0x82, 0xa2]); // あい
    expect(decodeTextFile(sjis)).toBe("あい");
  });
});
