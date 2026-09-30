import { kanaCandidates } from "./kana-layout";
import { romajiCandidates, type Candidate } from "./romaji";

/** Cách nhập: romaji và kana đọc phím trực tiếp; IME để bộ gõ của hệ điều hành tự ghép chữ. */
export type InputMethod = "ROMAJI" | "KANA" | "IME";

export interface PressResult {
  ok: boolean;
  /** Phím này vừa gõ xong một cụm kana (ví dụ "shi" → し) */
  advanced: boolean;
  /** Đã gõ xong toàn bộ câu */
  finished: boolean;
}

/**
 * Trạng thái gõ một câu. Tại mỗi vị trí có nhiều cách gõ hợp lệ (し = shi/si/ci, きゃ = kya
 * hoặc ki+xya…); bộ so khớp giữ phần đã gõ của cụm hiện tại và chấp nhận phím nếu vẫn còn ít
 * nhất một cách gõ bắt đầu bằng chuỗi đó. Không có quay lui: phím sai bị từ chối ngay và
 * không làm thay đổi trạng thái — đúng cách các trò gõ phím Nhật (寿司打, e-typing) vận hành.
 */
export class TypingRun {
  /** Chuỗi kana cần gõ (đã bỏ dấu câu), giữ nguyên hiragana/katakana gốc */
  readonly kana: string;
  private readonly cands: Candidate[][];
  /** Gợi ý ngắn nhất từ vị trí i tới hết câu */
  private readonly canon: string[];

  /** Số kana đã gõ xong */
  pos = 0;
  /** Phím đã gõ của cụm đang dở */
  buf = "";
  /** Mọi phím đúng đã gõ trong câu, theo thứ tự */
  typed = "";

  constructor(kana: string, method: Exclude<InputMethod, "IME">) {
    this.kana = kana;
    this.cands = method === "KANA" ? kanaCandidates(kana) : romajiCandidates(kana);
    this.canon = new Array(kana.length + 1).fill("");
    for (let i = kana.length - 1; i >= 0; i--) {
      const best = this.cands[i][0];
      this.canon[i] = best ? best.keys + (this.canon[i + best.len] ?? "") : "";
    }
  }

  get finished(): boolean {
    return this.pos >= this.kana.length;
  }

  /** Mọi vị trí đều có ít nhất một cách gõ — câu nào sai điều này thì không bao giờ gõ xong. */
  get typeable(): boolean {
    return this.cands.every((c) => c.length > 0);
  }

  /** Số phím tối thiểu để gõ cả câu theo gợi ý */
  get minKeys(): number {
    return this.canon[0].length;
  }

  private match(): Candidate | undefined {
    return this.cands[this.pos]?.find((c) => c.keys.startsWith(this.buf));
  }

  press(key: string): PressResult {
    if (this.finished) return { ok: false, advanced: false, finished: true };
    const next = this.buf + key;
    const options = this.cands[this.pos].filter((c) => c.keys.startsWith(next));
    if (options.length === 0) return { ok: false, advanced: false, finished: false };

    this.typed += key;
    const done = options.find((c) => c.keys === next);
    if (done) {
      this.pos += done.len;
      this.buf = "";
      return { ok: true, advanced: true, finished: this.finished };
    }
    this.buf = next;
    return { ok: true, advanced: false, finished: false };
  }

  /** Phần phím còn phải gõ, bám theo cách người học đang chọn (gõ "si" thì gợi ý đổi từ "shi"). */
  rest(): string {
    const m = this.match();
    if (!m) return "";
    return m.keys.slice(this.buf.length) + this.canon[this.pos + m.len];
  }

  nextKey(): string | undefined {
    return this.rest()[0];
  }

  /** Khoảng kana [start, end) của cụm đang gõ — để tô sáng chữ đang gõ trên câu mẫu. */
  current(): { start: number; end: number } {
    const m = this.match();
    return { start: this.pos, end: this.pos + (m?.len ?? 1) };
  }
}
