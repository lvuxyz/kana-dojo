import type { InputMethod } from "./engine";
import type { ContentType } from "./phrases";
import type { TypingMode } from "./score";

/* Kỷ lục và lịch sử luyện gõ — hiện chỉ lưu trên trình duyệt (localStorage), chưa đồng bộ lên
 * tài khoản. Mọi phép tính là hàm thuần để test được; đọc/ghi bộ nhớ nằm riêng ở cuối file. */

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
}

export const RECENT_LIMIT = 10;

export function emptyHistory(): TypingHistory {
  return { totalSessions: 0, totalDurationMs: 0, bests: [], recent: [] };
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
      totalSessions: h.totalSessions + 1,
      totalDurationMs: h.totalDurationMs + s.durationMs,
      bests: [best, ...h.bests.filter((b) => !sameCombo(b, s))],
      recent: [s, ...h.recent].slice(0, RECENT_LIMIT),
    },
    personalBest: best.bestScore,
    newBest,
  };
}

/** Dữ liệu đọc từ bộ nhớ có thể hỏng hoặc từ phiên bản cũ: không đúng hình dạng thì bỏ, bắt đầu lại. */
export function parseHistory(raw: string | null): TypingHistory {
  if (!raw) return emptyHistory();
  try {
    const h = JSON.parse(raw) as Partial<TypingHistory>;
    if (
      typeof h.totalSessions === "number" &&
      typeof h.totalDurationMs === "number" &&
      Array.isArray(h.bests) &&
      Array.isArray(h.recent)
    ) {
      return h as TypingHistory;
    }
  } catch {
    /* JSON hỏng */
  }
  return emptyHistory();
}

const STORAGE_KEY = "kd.typing.history.v1";

export function loadHistory(): TypingHistory {
  try {
    return parseHistory(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // Chế độ ẩn danh / trình duyệt chặn lưu trữ: vẫn chơi được, chỉ không nhớ kỷ lục.
    return emptyHistory();
  }
}

export function saveHistory(h: TypingHistory): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
  } catch {
    /* đầy bộ nhớ hoặc bị chặn: bỏ qua */
  }
}
