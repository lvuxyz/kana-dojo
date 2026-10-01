/* Kho dữ liệu người dùng trên máy — thay cho CSDL ở chế độ cá nhân (xem docs/LOCAL_MODE.md).

   Toàn bộ trạng thái học tập nằm trong MỘT khoá localStorage. Không có tài khoản: mỗi trình duyệt là một người học.
   Trình duyệt chặn lưu trữ (cửa sổ ẩn danh…) thì rơi về bộ nhớ tạm của tab: vẫn dùng được, chỉ không nhớ sau khi đóng. */

import type { CardState, ItemType } from "../types";
import { browserZone } from "./time";

export const STORAGE_KEY = "kd.local.v1";

export interface LocalCard {
  id: number;
  type: ItemType;
  itemId: number;
  state: CardState;
  stability: number;
  difficulty: number;
  dueAt: string;
  lastReviewedAt: string | null;
  reps: number;
  lapses: number;
  learningStep: number;
  /** Ngày địa phương thẻ được chấm lần đầu — dùng đếm hạn mức thẻ mới mỗi ngày. */
  introducedOn: string | null;
}

export interface LocalDay {
  xp: number;
  reviews: number;
  chars: number;
  studyMs: number;
  goalMet: boolean;
}

export interface LocalState {
  v: 1;
  profile: {
    displayName: string;
    timezone: string;
    dailyGoalXp: number;
    locale: string;
    createdAt: string;
  };
  stats: {
    xpTotal: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string | null;
    streakFreezes: number;
    /** Thứ Hai (ngày địa phương) của lần hồi thẻ băng gần nhất. */
    lastFreezeRefill: string | null;
    totalReviews: number;
    totalWritingMs: number;
  };
  /** Hoạt động theo ngày địa phương "YYYY-MM-DD". */
  daily: Record<string, LocalDay>;
  /** Khoá `${type}:${itemId}`. */
  cards: Record<string, LocalCard>;
  nextCardId: number;
  writing: {
    /** Điểm cao nhất của mỗi ký tự (khoá = id kana). */
    best: Record<string, number>;
    /** Ký tự đã từng viết đạt (khoá = id kana). */
    passed: Record<string, true>;
    /** Điểm trung bình của tối đa 10 lượt viết gần nhất, mới nhất ở đầu. */
    recent: number[];
  };
  /** Huy hiệu đã đạt: mã → thời điểm ISO. */
  badges: Record<string, string>;
  quizAttempts: Record<string, { quizId: number; startedAt: string; submitted: boolean }>;
  nextAttemptId: number;
}

export function freshState(now: Date = new Date()): LocalState {
  return {
    v: 1,
    profile: {
      displayName: "Học viên",
      // Dùng cá nhân: mặc định theo múi giờ máy (bản có máy chủ mặc định giờ Việt Nam).
      timezone: browserZone(),
      dailyGoalXp: 50,
      locale: "vi",
      createdAt: now.toISOString(),
    },
    stats: {
      xpTotal: 0, level: 1, currentStreak: 0, longestStreak: 0, lastActiveDate: null,
      streakFreezes: 2, lastFreezeRefill: null, totalReviews: 0, totalWritingMs: 0,
    },
    daily: {},
    cards: {},
    nextCardId: 1,
    writing: { best: {}, passed: {}, recent: [] },
    badges: {},
    quizAttempts: {},
    nextAttemptId: 1,
  };
}

// ---------------------------------------------------------------------------
// Đọc / ghi
// ---------------------------------------------------------------------------

/** Bộ nhớ tạm khi không có localStorage (và khi chạy test trên Node). */
let memory: string | null = null;

function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function isState(value: unknown): value is LocalState {
  const s = value as LocalState | null;
  return !!s && s.v === 1 && !!s.profile && !!s.stats && !!s.cards && !!s.writing && !!s.daily && !!s.badges;
}

export function loadState(): LocalState {
  let raw: string | null = memory;
  const ls = storage();
  if (ls) {
    try { raw = ls.getItem(STORAGE_KEY); } catch { /* bị chặn: dùng bộ nhớ tạm */ }
  }
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isState(parsed)) return parsed;
    } catch { /* hỏng: bắt đầu lại, bản hỏng được giữ lại ở dưới */ }
    // Giữ bản hỏng để người dùng còn cứu được, thay vì ghi đè mất dữ liệu.
    try { ls?.setItem(`${STORAGE_KEY}.corrupt`, raw); } catch { /* đầy bộ nhớ */ }
  }
  // Lần đầu dùng: ghi ngay hồ sơ mặc định để `createdAt` không đổi giữa các lần đọc.
  const fresh = freshState();
  saveState(fresh);
  return fresh;
}

export function saveState(state: LocalState): void {
  const raw = JSON.stringify(state);
  memory = raw;
  const ls = storage();
  if (!ls) return;
  try { ls.setItem(STORAGE_KEY, raw); } catch { /* đầy bộ nhớ hoặc bị chặn: vẫn còn bản trong bộ nhớ tạm */ }
}

/** Đọc → sửa → ghi trong một bước. Mọi thao tác ghi đi qua đây để không bao giờ giữ trạng thái cũ. */
export function mutate<T>(fn: (state: LocalState) => T): T {
  const state = loadState();
  const result = fn(state);
  saveState(state);
  return result;
}

export function readState<T>(fn: (state: LocalState) => T): T {
  return fn(loadState());
}

/** Xoá toàn bộ dữ liệu học tập trên máy này. */
export function resetState(): void {
  memory = null;
  const ls = storage();
  try { ls?.removeItem(STORAGE_KEY); } catch { /* bỏ qua */ }
}
