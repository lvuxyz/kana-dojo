import type { InputMethod } from "./engine";
import type { ContentType } from "./phrases";
import { isTypeable } from "./romaji";
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
      // Bản lưu cũ chưa có weakKana.
      const weakKana = h.weakKana && typeof h.weakKana === "object" && !Array.isArray(h.weakKana) ? h.weakKana : {};
      return { ...(h as TypingHistory), weakKana };
    }
  } catch {
    /* JSON hỏng */
  }
  return emptyHistory();
}

/** Khoá lưu tách theo tài khoản: máy dùng chung (máy ở nhà, phòng máy) thì mỗi người một kỷ lục. */
export function historyKey(owner: string | number): string {
  return `kd.typing.history.v1:${owner}`;
}

export function loadHistory(owner: string | number): TypingHistory {
  try {
    return parseHistory(window.localStorage.getItem(historyKey(owner)));
  } catch {
    // Chế độ ẩn danh / trình duyệt chặn lưu trữ: vẫn chơi được, chỉ không nhớ kỷ lục.
    return emptyHistory();
  }
}

export function saveHistory(owner: string | number, h: TypingHistory): void {
  try {
    window.localStorage.setItem(historyKey(owner), JSON.stringify(h));
  } catch {
    /* đầy bộ nhớ hoặc bị chặn: bỏ qua */
  }
}
