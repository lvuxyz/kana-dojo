import { describe, expect, it } from "vitest";
import { parseInline, parseMarkup, previewOf } from "./markup";

describe("định dạng trong dòng", () => {
  it("in đậm, mã, furigana, chữ thường — theo đúng thứ tự xuất hiện", () => {
    expect(parseInline("Đọc **quan trọng** là `wa`, {水|みず} nhé")).toEqual([
      { t: "text", v: "Đọc " },
      { t: "bold", v: "quan trọng" },
      { t: "text", v: " là " },
      { t: "code", v: "wa" },
      { t: "text", v: ", " },
      { t: "ruby", base: "水", rt: "みず" },
      { t: "text", v: " nhé" },
    ]);
  });

  it("cú pháp dang dở hay lồng sai thì giữ nguyên là chữ, không nuốt nội dung", () => {
    expect(parseInline("**chưa đóng")).toEqual([{ t: "text", v: "**chưa đóng" }]);
    expect(parseInline("{水|}")).toEqual([{ t: "text", v: "{水|}" }]);
    expect(parseInline("{|みず}")).toEqual([{ t: "text", v: "{|みず}" }]);
  });
});

describe("khối", () => {
  it("tiêu đề ba cấp, đoạn văn, đường kẻ", () => {
    expect(parseMarkup("# Một\n## Hai\n### Ba\n\nĐoạn\n\n---")).toEqual([
      { t: "heading", level: 1, inline: [{ t: "text", v: "Một" }] },
      { t: "heading", level: 2, inline: [{ t: "text", v: "Hai" }] },
      { t: "heading", level: 3, inline: [{ t: "text", v: "Ba" }] },
      { t: "para", inline: [{ t: "text", v: "Đoạn" }] },
      { t: "hr" },
    ]);
  });

  it("các dòng liền nhau trong một đoạn giữ chỗ xuống dòng", () => {
    expect(parseMarkup("dòng 1\ndòng 2")).toEqual([
      { t: "para", inline: [{ t: "text", v: "dòng 1" }, { t: "br" }, { t: "text", v: "dòng 2" }] },
    ]);
  });

  it("danh sách gạch đầu dòng và đánh số; đổi kiểu thì tách khối", () => {
    expect(parseMarkup("- a\n- b\n1. x\n2. y")).toEqual([
      { t: "ul", items: [[{ t: "text", v: "a" }], [{ t: "text", v: "b" }]] },
      { t: "ol", items: [[{ t: "text", v: "x" }], [{ t: "text", v: "y" }]] },
    ]);
  });

  it("trích dẫn nhiều dòng", () => {
    expect(parseMarkup("> một\n> hai")).toEqual([
      { t: "quote", inline: [{ t: "text", v: "một" }, { t: "br" }, { t: "text", v: "hai" }] },
    ]);
  });

  it("đoạn văn dừng lại trước khối đặc biệt kế tiếp", () => {
    expect(parseMarkup("chữ\n- mục")).toEqual([
      { t: "para", inline: [{ t: "text", v: "chữ" }] },
      { t: "ul", items: [[{ t: "text", v: "mục" }]] },
    ]);
  });

  it("CRLF và văn bản trống", () => {
    expect(parseMarkup("a\r\n\r\nb")).toHaveLength(2);
    expect(parseMarkup("")).toEqual([]);
    expect(parseMarkup("   \n\n  ")).toEqual([]);
  });

  it("HTML và liên kết không bao giờ thành phần tử: chỉ là chữ", () => {
    const blocks = parseMarkup('<script>alert(1)</script> [x](javascript:alert(1)) <img src=x onerror=alert(1)>');
    expect(JSON.stringify(blocks)).not.toMatch(/"t":"(?!text|para|br)/);
    expect(blocks).toEqual([{ t: "para", inline: [{ t: "text", v: '<script>alert(1)</script> [x](javascript:alert(1)) <img src=x onerror=alert(1)>' }] }]);
  });
});

describe("xem trước", () => {
  it("bỏ ký hiệu định dạng, giữ kanji của furigana, rút gọn", () => {
    expect(previewOf("# Tiêu đề\n- **mục** {水|みず}")).toBe("Tiêu đề mục 水");
    const long = previewOf("a".repeat(200), 20);
    expect(long).toBe(`${"a".repeat(20)}…`);
  });
});
