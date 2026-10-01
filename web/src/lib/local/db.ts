/** Kho dữ liệu cục bộ thay cho PostgreSQL: một đối tượng JSON trong localStorage.
 *
 *  Mỗi request đọc lại từ kho (để nhiều tab thấy cùng dữ liệu) rồi chỉ ghi khi cần. Các handler đồng bộ
 *  nên giữa lúc đọc và ghi không có điểm `await` — tương đương một giao dịch của backend. */
import type { CardState, ItemType, Plan } from "../types";

export const DB_KEY = "kanadojo.local.v1";

export interface LocalUser {
  id: number; email: string; username: string;
  /** `<muối>$<thuật toán>:<băm>` — chỉ để không lưu mật khẩu thô; dữ liệu nằm ngay trên trình duyệt này. */
  passwordHash: string;
  displayName: string; avatarUrl: string | null; role: "USER" | "ADMIN"; plan: Plan;
  timezone: string; locale: string; dailyGoalXp: number; createdAt: string;
}

export interface LocalCard {
  id: number; itemType: ItemType; itemId: number; state: CardState;
  stability: number; difficulty: number;
  /** ISO-8601 */ dueAt: string; lastReviewedAt: string | null;
  reps: number; lapses: number; learningStep: number;
}

export interface LocalStats {
  xpTotal: number; level: number; currentStreak: number; longestStreak: number;
  lastActiveDate: string | null; streakFreezes: number; totalReviews: number; totalWritingMs: number;
  /** Thứ Hai (giờ VN) của lần hồi thẻ băng gần nhất — thay cho job @Scheduled của backend. */
  freezeRefillWeek: string;
}

export interface LocalDaily { xpEarned: number; reviewsDone: number; charsWritten: number; studyMs: number; goalMet: boolean }

export interface LocalQuizAttempt { quizId: number; startedAt: string; submitted: boolean }

export interface UserData {
  stats: LocalStats;
  cards: LocalCard[];
  /** theo ngày địa phương `YYYY-MM-DD` */
  daily: Record<string, LocalDaily>;
  /** mã huy hiệu → thời điểm đạt (ISO) */
  badges: Record<string, string>;
  writing: {
    /** id ký tự → điểm cao nhất */ best: Record<string, number>;
    /** id ký tự đã từng viết đạt */ passed: Record<string, true>;
    /** điểm trung bình của tối đa 10 lần viết gần nhất, mới nhất trước */ recent: number[];
  };
  quizAttempts: Record<string, LocalQuizAttempt>;
}

export interface Db {
  v: 1;
  seq: { user: number; card: number; quizAttempt: number };
  users: LocalUser[];
  /** người đang đăng nhập trên trình duyệt này */
  session: number | null;
  data: Record<string, UserData>;
}

export interface KV { getItem(key: string): string | null; setItem(key: string, value: string): void }

const memory = new Map<string, string>();
const memoryKv: KV = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => { memory.set(k, v); },
};

let override: KV | null = null;
let warned = false;

/** Dùng cho test: thay kho lưu trữ (truyền null để quay về mặc định). */
export function setStorage(kv: KV | null) { override = kv; }

function storage(): KV {
  if (override) return override;
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  } catch { /* truy cập localStorage có thể ném lỗi (chế độ riêng tư, chặn cookie) */ }
  if (!warned) {
    warned = true;
    console.warn("[kana-dojo] Không dùng được localStorage — dữ liệu chỉ giữ tới khi tải lại trang.");
  }
  return memoryKv;
}

let clock: () => number = () => Date.now();
/** Dùng cho test: thay đồng hồ (truyền null để quay về mặc định). */
export function setClock(fn: (() => number) | null) { clock = fn ?? (() => Date.now()); }
export const nowMs = () => clock();

export const emptyDb = (): Db => ({ v: 1, seq: { user: 0, card: 0, quizAttempt: 0 }, users: [], session: null, data: {} });

export function load(): Db {
  const kv = storage();
  const text = kv.getItem(DB_KEY);
  if (!text) return emptyDb();
  try {
    const parsed = JSON.parse(text) as Db;
    if (parsed?.v === 1 && Array.isArray(parsed.users) && parsed.data && parsed.seq) return parsed;
    throw new Error("Sai định dạng");
  } catch (e) {
    // Không ghi đè im lặng: giữ bản hỏng ở khoá riêng để còn cứu được.
    console.warn("[kana-dojo] Dữ liệu cục bộ bị hỏng, đã sao lưu sang khoá .corrupt và bắt đầu lại.", e);
    try { kv.setItem(`${DB_KEY}.corrupt`, text); } catch { /* hết dung lượng thì đành bỏ */ }
    return emptyDb();
  }
}

export function save(db: Db): void {
  storage().setItem(DB_KEY, JSON.stringify(db));
}

export const newStats = (week: string): LocalStats => ({
  xpTotal: 0, level: 1, currentStreak: 0, longestStreak: 0, lastActiveDate: null,
  streakFreezes: 2, totalReviews: 0, totalWritingMs: 0, freezeRefillWeek: week,
});

/** Dữ liệu học của một người; tạo rỗng nếu chưa có (chưa lưu cho tới khi handler ghi). */
export function userData(db: Db, userId: number, week: string): UserData {
  const key = String(userId);
  return (db.data[key] ??= {
    stats: newStats(week), cards: [], daily: {}, badges: {},
    writing: { best: {}, passed: {}, recent: [] }, quizAttempts: {},
  });
}

export const findUser = (db: Db, userId: number): LocalUser | undefined => db.users.find((u) => u.id === userId);
