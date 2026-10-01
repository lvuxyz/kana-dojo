import { describe, expect, it } from "vitest";
import { VOCABULARY } from "@/data/vocabulary";
import { VOCAB_LEVELS, fold, searchVocabulary } from "./vocabulary";

describe("tìm từ vựng", () => {
  it("hiện ĐỦ mọi từ của một cấp, không bị cắt ở 60", () => {
    expect(VOCAB_LEVELS).toEqual([5, 4]);
    expect(searchVocabulary(5, "")).toHaveLength(70);
    expect(searchVocabulary(4, "")).toHaveLength(10);
    // Hai cấp không lẫn vào nhau và cộng lại đúng tổng
    expect(searchVocabulary(5, "").length + searchVocabulary(4, "").length).toBe(VOCABULARY.length);
  });

  it("từ cuối danh sách N5 (vị trí 61–70) tìm được", () => {
    const tail = VOCABULARY.filter((v) => v.jlptLevel === 5).slice(60);
    expect(tail).toHaveLength(10);
    const shown = new Set(searchVocabulary(5, "").map((v) => v.id));
    for (const v of tail) expect(shown.has(v.id), v.word).toBe(true);
  });

  it("gõ không dấu vẫn ra từ có dấu; tìm theo từ, cách đọc, romaji và nghĩa", () => {
    expect(fold("Bạn bè Đi")).toBe("ban be di");
    expect(searchVocabulary(5, "ban").map((v) => v.word)).toEqual(["あなた", "友達", "日本", "夜"]);
    expect(searchVocabulary(5, "SAKANA").map((v) => v.word)).toEqual(["魚"]); // romaji, không phân biệt hoa thường
    expect(searchVocabulary(5, "たべる").map((v) => v.word)).toEqual(["食べる"]); // cách đọc
    expect(searchVocabulary(5, "魚").map((v) => v.word)).toEqual(["魚"]); // chính từ
    expect(searchVocabulary(5, "  ").length).toBe(70); // chỉ khoảng trắng = không lọc
    expect(searchVocabulary(5, "zzzz")).toEqual([]);
  });
});
