/* Cú pháp nhẹ cho ghi chú — đủ để viết tài liệu học tiếng Nhật, không hơn:

     # Tiêu đề    ## Tiêu đề nhỏ    ### Mục
     - gạch đầu dòng     1. đánh số      > trích dẫn      ---  (đường kẻ)
     **in đậm**    `mã / romaji`    {漢字|かんじ}  (kanji có furigana, cùng cú pháp với phòng luyện gõ)

   Cố ý KHÔNG hỗ trợ liên kết, ảnh, HTML: ghi chú là dữ liệu của người dùng (và có thể đến từ tệp sao lưu của người khác),
   nên bộ đọc chỉ sinh ra cây dữ liệu thuần; giao diện dựng phần tử React từ cây đó — không có chỗ nào chèn HTML thô. */

export type Inline =
  | { t: "text"; v: string }
  | { t: "bold"; v: string }
  | { t: "code"; v: string }
  | { t: "ruby"; base: string; rt: string }
  | { t: "br" };

export type Block =
  | { t: "heading"; level: 1 | 2 | 3; inline: Inline[] }
  | { t: "para"; inline: Inline[] }
  | { t: "ul"; items: Inline[][] }
  | { t: "ol"; items: Inline[][] }
  | { t: "quote"; inline: Inline[] }
  | { t: "hr" };

const INLINE = /\*\*([^*\n]+)\*\*|`([^`\n]+)`|\{([^|{}\n]+)\|([^{}\n]+)\}/g;

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of src.matchAll(INLINE)) {
    if (m.index > last) out.push({ t: "text", v: src.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ t: "bold", v: m[1] });
    else if (m[2] !== undefined) out.push({ t: "code", v: m[2] });
    else out.push({ t: "ruby", base: m[3], rt: m[4] });
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ t: "text", v: src.slice(last) });
  return out;
}

/** Nhiều dòng liền nhau trong một đoạn giữ nguyên chỗ xuống dòng (người học hay viết từng dòng một). */
function joinLines(lines: string[]): Inline[] {
  const out: Inline[] = [];
  lines.forEach((line, i) => {
    if (i > 0) out.push({ t: "br" });
    out.push(...parseInline(line));
  });
  return out;
}

const HEADING = /^(#{1,3})\s+(.*)$/;
const UL = /^[-*]\s+(.*)$/;
const OL = /^\d+[.)]\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;
const HR = /^(-{3,}|\*{3,})$/;

export function parseMarkup(src: string): Block[] {
  const blocks: Block[] = [];
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  let i = 0;

  const isSpecial = (line: string) => HEADING.test(line) || UL.test(line) || OL.test(line) || QUOTE.test(line) || HR.test(line);

  while (i < lines.length) {
    const line = lines[i].trimEnd();
    if (!line.trim()) { i++; continue; }

    let m: RegExpMatchArray | null;
    if (HR.test(line.trim())) {
      blocks.push({ t: "hr" });
      i++;
    } else if ((m = line.match(HEADING))) {
      blocks.push({ t: "heading", level: m[1].length as 1 | 2 | 3, inline: parseInline(m[2]) });
      i++;
    } else if (UL.test(line) || OL.test(line)) {
      const ordered = OL.test(line);
      const re = ordered ? OL : UL;
      const items: Inline[][] = [];
      while (i < lines.length && (m = lines[i].trimEnd().match(re))) {
        items.push(parseInline(m[1]));
        i++;
      }
      blocks.push({ t: ordered ? "ol" : "ul", items });
    } else if (QUOTE.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && (m = lines[i].trimEnd().match(QUOTE))) {
        quoted.push(m[1]);
        i++;
      }
      blocks.push({ t: "quote", inline: joinLines(quoted) });
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() && !(para.length > 0 && isSpecial(lines[i].trimEnd()))) {
        para.push(lines[i].trimEnd());
        i++;
      }
      blocks.push({ t: "para", inline: joinLines(para) });
    }
  }
  return blocks;
}

/** Bản xem trước ngắn (một dòng) của ghi chú, bỏ ký hiệu định dạng — dùng cho danh sách. */
export function previewOf(body: string, max = 90): string {
  const text = body
    .replace(/\{([^|{}\n]+)\|[^{}\n]+\}/g, "$1")
    .replace(/[*`#>]/g, "")
    .replace(/^\s*(?:[-]|\d+[.)])\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
