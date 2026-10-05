import { z } from "zod";

/* Toàn bộ tiến độ của người học — thứ duy nhất được lưu, và chỉ lưu trong trình duyệt (xem store.ts).
   Không có tài khoản, không có máy chủ: dữ liệu này là của người học, đi theo thiết bị. */

export const STATE_VERSION = 1;

export const DEFAULT_DAILY_GOAL_XP = 50;
export const MIN_DAILY_GOAL_XP = 10;
export const MAX_DAILY_GOAL_XP = 500;
export const MAX_STREAK_FREEZES = 2;

const dayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const count = z.number().int().min(0);

/** Thẻ đã được học ít nhất một lần. Thẻ NEW chỉ tồn tại "ảo" trong hàng đợi, nên không lưu ở đây. */
const cardSchema = z.object({
  itemType: z.enum(["KANA_WRITING", "KANA_READING", "VOCAB_MEANING", "VOCAB_READING"]),
  /** Kana: chính ký tự ("あ"). Từ vựng: id dạng chuỗi ("12"). */
  itemId: z.string().min(1),
  state: z.enum(["LEARNING", "REVIEW", "RELEARNING"]),
  stability: z.number().min(0),
  difficulty: z.number().min(0).max(10),
  dueAt: z.number(),
  lastReviewedAt: z.number().nullable(),
  reps: count,
  lapses: count,
  learningStep: count,
  /** Ngày (giờ máy) thẻ được học lần đầu — để giới hạn số thẻ mới mỗi ngày. */
  introducedDay: dayKeySchema.nullable(),
});

const dailySchema = z.object({
  xp: count, reviews: count, chars: count, studyMs: count, goalMet: z.boolean(),
});

export const progressSchema = z.object({
  version: z.literal(STATE_VERSION),
  settings: z.object({
    dailyGoalXp: z.number().int().min(MIN_DAILY_GOAL_XP).max(MAX_DAILY_GOAL_XP),
  }),
  stats: z.object({
    xpTotal: count,
    currentStreak: count,
    longestStreak: count,
    lastActiveDate: dayKeySchema.nullable(),
    streakFreezes: count.max(MAX_STREAK_FREEZES),
    /** Thứ Hai của tuần đã hồi thẻ băng gần nhất. */
    freezeWeek: dayKeySchema.nullable(),
    totalReviews: count,
    totalWritingMs: count,
  }),
  daily: z.record(dayKeySchema, dailySchema),
  cards: z.record(z.string(), cardSchema),
  writing: z.object({
    /** Điểm cao nhất từng đạt của mỗi ký tự. */
    best: z.record(z.string(), z.number().min(0).max(100)),
    /** Các ký tự đã từng viết đạt. */
    passed: z.array(z.string()),
    /** Điểm của tối đa 10 lần viết gần nhất, mới nhất ở cuối — để xét huy hiệu "Mười điểm tuyệt đối". */
    recent: z.array(z.number().min(0).max(100)).max(10),
  }),
  /** Mã huy hiệu → thời điểm đạt (mili-giây epoch). */
  badges: z.record(z.string(), z.number()),
});

export type ProgressState = z.infer<typeof progressSchema>;
export type CardRecord = ProgressState["cards"][string];
export type DailyRecord = ProgressState["daily"][string];

export function emptyState(): ProgressState {
  return {
    version: STATE_VERSION,
    settings: { dailyGoalXp: DEFAULT_DAILY_GOAL_XP },
    stats: {
      xpTotal: 0, currentStreak: 0, longestStreak: 0, lastActiveDate: null,
      streakFreezes: MAX_STREAK_FREEZES, freezeWeek: null, totalReviews: 0, totalWritingMs: 0,
    },
    daily: {},
    cards: {},
    writing: { best: {}, passed: [], recent: [] },
    badges: {},
  };
}

export type ParseResult = { ok: true; state: ProgressState } | { ok: false; error: string };

/** Kiểm tra một giá trị đã parse JSON — dùng chung cho localStorage, tệp tiến độ cũ và phần `progress` của tệp sao lưu bọc. */
export function parseStateValue(raw: unknown): ParseResult {
  const version = (raw as { version?: unknown } | null)?.version;
  if (typeof version === "number" && version > STATE_VERSION) {
    return { ok: false, error: "Tệp được tạo bởi phiên bản Kana Dōjō mới hơn. Hãy tải lại trang để cập nhật rồi thử lại." };
  }
  const parsed = progressSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Tệp không đúng định dạng tiến độ của Kana Dōjō." };
  }
  return { ok: true, state: parsed.data };
}

/** Đọc và kiểm tra một khối JSON (từ localStorage hoặc từ tệp người dùng nhập). */
export function parseState(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "Tệp không phải JSON hợp lệ." };
  }
  return parseStateValue(raw);
}
