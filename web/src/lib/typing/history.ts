import { z } from "zod";
import type { InputMethod } from "./engine";
import type { ContentType } from "./phrases";
import { isTypeable } from "./romaji";
import type { TypingMode } from "./score";

/* Kỷ lục và lịch sử luyện gõ — chỉ lưu trên trình duyệt này (localStorage), không nằm trong tệp sao lưu.
 * Mọi phép tính là hàm thuần để test được; đọc/ghi bộ nhớ nằm riêng ở cuối file. */

export interface SessionRecord {
  method: InputMethod;
  content: ContentType;
  mode: TypingMode;
  score: number;
  kpm: number;
  accuracy: number;
  durationMs: number;
  /** ISO-8601 */
  at: string;
}

export interface BestRecord {
  method: InputMethod;
  content: ContentType;
  mode: TypingMode;
  bestScore: number;
  bestKpm: number;
  bestAccuracy: number;
  plays: number;
  lastPlayedAt: string;
}

export interface TypingHistory {
  totalSessions: number;
  totalDurationMs: number;
  /** Kỷ lục theo từng tổ hợp cách nhập × nội dung × chế độ, tổ hợp chơi gần nhất đứng đầu */
  bests: BestRecord[];
  /** Các lượt gần nhất, mới nhất đứng đầu */
  recent: SessionRecord[];
  /** Kana hay gõ sai → mức "yếu" (số lần sai, giảm dần theo từng lượt luyện) */
  weakKana: Record<string, number>;
}

export const RECENT_LIMIT = 10;
/** Mỗi lượt luyện, mức yếu cũ còn lại 85%: một lần sai tự rơi khỏi danh sách sau 5 lượt không sai lại,
 *  năm lần sai thì sau khoảng 15 lượt. */
export const WEAK_DECAY = 0.85;
const WEAK_DROP_BELOW = 0.5;
export const WEAK_LIMIT = 40;

export function emptyHistory(): TypingHistory {
  return { totalSessions: 0, totalDurationMs: 0, bests: [], recent: [], weakKana: {} };
}

/**
 * Cộng các lần gõ sai của một lượt vào danh sách chữ yếu. Chỉ giữ cụm kana gõ được (kanji ở chế độ
 * IME không luyện lại bằng bài kana được), giữ tối đa WEAK_LIMIT chữ yếu nhất.
 */
export function addWeak(h: TypingHistory, misses: [string, number][]): TypingHistory {
  const next: Record<string, number> = {};
  for (const [kana, w] of Object.entries(h.weakKana)) next[kana] = w * WEAK_DECAY;
  for (const [kana, n] of misses) {
    if (!kana || !Array.from(kana).every(isTypeable)) continue;
    next[kana] = (next[kana] ?? 0) + n;
  }
  const kept = Object.entries(next)
    .filter(([, w]) => w >= WEAK_DROP_BELOW)
    .sort((a, b) => b[1] - a[1])
    .slice(0, WEAK_LIMIT)
    .map(([k, w]) => [k, Math.round(w * 100) / 100] as const);
  return { ...h, weakKana: Object.fromEntries(kept) };
}

/** Chữ yếu, yếu nhất trước. */
export function weakList(h: TypingHistory): [string, number][] {
  return Object.entries(h.weakKana).sort((a, b) => b[1] - a[1]);
}

const sameCombo = (a: { method: string; content: string; mode: string }, b: typeof a) =>
  a.method === b.method && a.content === b.content && a.mode === b.mode;

export function findBest(h: TypingHistory, combo: Pick<BestRecord, "method" | "content" | "mode">): BestRecord | undefined {
  return h.bests.find((b) => sameCombo(b, combo));
}

/** Thêm một lượt; trả về lịch sử mới (không sửa bản cũ) kèm kỷ lục của tổ hợp đó. */
export function addSession(
  h: TypingHistory,
  s: SessionRecord,
): { history: TypingHistory; personalBest: number; newBest: boolean } {
  const previous = findBest(h, s);
  const newBest = !previous || s.score > previous.bestScore;
  const best: BestRecord = previous
    ? {
        ...previous,
        bestScore: Math.max(previous.bestScore, s.score),
        bestKpm: Math.max(previous.bestKpm, s.kpm),
        bestAccuracy: Math.max(previous.bestAccuracy, s.accuracy),
        plays: previous.plays + 1,
        lastPlayedAt: s.at,
      }
    : {
        method: s.method,
        content: s.content,
        mode: s.mode,
        bestScore: s.score,
        bestKpm: s.kpm,
        bestAccuracy: s.accuracy,
        plays: 1,
        lastPlayedAt: s.at,
      };

  return {
    history: {
      ...h,
      totalSessions: h.totalSessions + 1,
      totalDurationMs: h.totalDurationMs + s.durationMs,
      bests: [best, ...h.bests.filter((b) => !sameCombo(b, s))],
      recent: [s, ...h.recent].slice(0, RECENT_LIMIT),
    },
    personalBest: best.bestScore,
    newBest,
  };
}

/* Hình dạng từng mục. Cách nhập / nội dung / chế độ chỉ cần là chuỗi: một bản sau có thể thêm loại mới, và bản này
 * không được vì thế mà vứt kỷ lục đó đi khi ghi lại. */
const num = z.number(); // zod 4: z.number() vốn đã từ chối Infinity và NaN.
const sessionSchema = z.object({
  method: z.string(), content: z.string(), mode: z.string(),
  score: num, kpm: num, accuracy: num, durationMs: num, at: z.string(),
});
const bestSchema = z.object({
  method: z.string(), content: z.string(), mode: z.string(),
  bestScore: num, bestKpm: num, bestAccuracy: num, plays: num, lastPlayedAt: z.string(),
});

/** Giữ các mục đúng hình dạng, bỏ mục hỏng — một mục sửa tay sai không được xoá cả lịch sử, cũng không được lọt vào giao diện. */
function validItems<T>(items: unknown[], schema: z.ZodType<unknown>): T[] {
  return items.filter((x) => schema.safeParse(x).success) as T[];
}

/** Đọc một khối đã lưu. `null` = hỏng hoặc sai hình dạng (khác với "chưa có gì": đó là `raw === null`). */
export function parseHistoryStrict(raw: string): TypingHistory | null {
  try {
    const h = JSON.parse(raw) as Record<string, unknown> | null;
    if (
      h &&
      typeof h.totalSessions === "number" &&
      typeof h.totalDurationMs === "number" &&
      Array.isArray(h.bests) &&
      Array.isArray(h.recent)
    ) {
      // Bản lưu cũ chưa có weakKana.
      const weak = h.weakKana && typeof h.weakKana === "object" && !Array.isArray(h.weakKana) ? h.weakKana : {};
      return {
        totalSessions: h.totalSessions,
        totalDurationMs: h.totalDurationMs,
        bests: validItems<BestRecord>(h.bests, bestSchema),
        recent: validItems<SessionRecord>(h.recent, sessionSchema),
        weakKana: Object.fromEntries(Object.entries(weak).filter(([, w]) => typeof w === "number" && Number.isFinite(w))),
      };
    }
  } catch {
    /* JSON hỏng */
  }
  return null;
}

/** Dữ liệu đọc từ bộ nhớ có thể hỏng hoặc từ phiên bản cũ: không đúng hình dạng thì bắt đầu lại. */
export function parseHistory(raw: string | null): TypingHistory {
  return (raw && parseHistoryStrict(raw)) || emptyHistory();
}

/* Lưu trên trình duyệt của người học, cùng quy ước với tiến độ chính (lib/learning/store.ts): khoá có tiền tố `kd.`,
 * dữ liệu hỏng được giữ lại để cứu hộ thay vì bị ghi đè âm thầm, trình duyệt chặn lưu trữ thì vẫn chơi được trong bộ nhớ.
 * Không có tài khoản nên không có hậu tố: một trình duyệt = một kỷ lục. Kỷ lục luyện gõ lưu RIÊNG, chưa nằm trong tệp
 * sao lưu tiến độ (SPEC §2.1) — nhưng "Xoá toàn bộ tiến độ" ở Cài đặt có xoá nó (`clearHistory`). */
export const HISTORY_KEY = "kd.typing.history.v1";
/** Bản sao khối dữ liệu hỏng, giữ lại để còn cứu được. */
export const HISTORY_CORRUPT_KEY = "kd.typing.history.corrupt";

export function loadHistory(): TypingHistory {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (raw === null) return emptyHistory();
    const parsed = parseHistoryStrict(raw);
    if (parsed) return parsed;
    try {
      window.localStorage.setItem(HISTORY_CORRUPT_KEY, raw);
    } catch {
      /* hết dung lượng — đành chịu */
    }
  } catch {
    /* chế độ ẩn danh / trình duyệt chặn lưu trữ: vẫn chơi được, chỉ không nhớ kỷ lục */
  }
  return emptyHistory();
}

/** false nếu không ghi được (đầy bộ nhớ hoặc bị chặn): kỷ lục của lượt này chỉ còn đến khi đóng tab. */
export function saveHistory(h: TypingHistory): boolean {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
    return true;
  } catch {
    return false;
  }
}

/** Xoá kỷ lục và chữ hay sai (gọi cùng `resetProgress` khi người học xoá toàn bộ tiến độ). */
export function clearHistory(): void {
  try {
    window.localStorage.removeItem(HISTORY_KEY);
    window.localStorage.removeItem(HISTORY_CORRUPT_KEY);
  } catch {
    /* bị chặn lưu trữ: không có gì để xoá */
  }
}
