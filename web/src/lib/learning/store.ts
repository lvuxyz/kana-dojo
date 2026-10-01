import type { Grade, GradeResult, QuizResult, ReviewQueue, WritingResult, ItemType } from "../types";
import { gradeCard, recordWriting, buildQueue, type Outcome, type WritingInput } from "./reviews";
import { submitQuiz } from "./quiz";
import {
  MAX_DAILY_GOAL_XP, MIN_DAILY_GOAL_XP, emptyState, parseState, type ProgressState,
} from "./state";
import { systemClock } from "./time";

/* Nơi duy nhất đụng tới localStorage. Phần còn lại của bộ máy học là hàm thuần.

   Không có máy chủ nên đây là *toàn bộ* cơ sở dữ liệu: một khối JSON nhỏ trong trình duyệt của người học.
   Hệ quả cần nói rõ với người dùng (trang Cài đặt có nút xuất/nhập để sao lưu):
   - tiến độ gắn với trình duyệt + thiết bị, không tự đồng bộ giữa các máy;
   - xoá dữ liệu trang web hoặc dùng chế độ riêng tư thì mất. */

export const STORAGE_KEY = "kd.progress.v1";
/** Bản sao khối dữ liệu hỏng, giữ lại để người học còn cứu được thay vì bị ghi đè âm thầm. */
const CORRUPT_KEY = "kd.progress.corrupt";

/** Trạng thái dùng khi render phía máy chủ và lúc hydrate — chưa đọc được localStorage.
 *  Hook so sánh tham chiếu với hằng này để biết khi nào dữ liệu thật đã sẵn sàng. */
export const SERVER_STATE: ProgressState = emptyState();

let current: ProgressState | null = null;
let persistent = true;
let listening = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // truy cập localStorage cũng có thể ném lỗi khi trình duyệt chặn dữ liệu trang
  }
}

function load(): ProgressState {
  const ls = storage();
  if (!ls) {
    persistent = false;
    return emptyState();
  }
  let text: string | null;
  try {
    text = ls.getItem(STORAGE_KEY);
  } catch {
    persistent = false;
    return emptyState();
  }
  if (text === null) return emptyState();

  const parsed = parseState(text);
  if (parsed.ok) return parsed.state;
  try { ls.setItem(CORRUPT_KEY, text); } catch { /* hết dung lượng — đành chịu */ }
  return emptyState();
}

function persist(next: ProgressState) {
  const ls = storage();
  if (!ls) {
    persistent = false;
    return;
  }
  try {
    ls.setItem(STORAGE_KEY, JSON.stringify(next));
    persistent = true;
  } catch {
    persistent = false; // đầy dung lượng hoặc chế độ riêng tư chặn ghi: vẫn chạy trong bộ nhớ của tab
  }
}

function onStorage(e: StorageEvent) {
  if (e.key !== null && e.key !== STORAGE_KEY) return;
  // Tab khác vừa ghi (hoặc xoá toàn bộ): lấy bản mới nhất để hai tab không ghi đè lên nhau.
  current = load();
  emit();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!listening && typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
    listening = true;
  }
  return () => { listeners.delete(listener); };
}

export function getState(): ProgressState {
  if (typeof window === "undefined") return SERVER_STATE;
  return (current ??= load());
}

export const getServerState = (): ProgressState => SERVER_STATE;

/** false khi trình duyệt không cho ghi localStorage — tiến độ chỉ sống đến khi đóng tab. */
export const isPersistent = (): boolean => { getState(); return persistent; };

function commit<T>(outcome: Outcome<T>): T {
  current = outcome.state;
  persist(current);
  emit();
  return outcome.result;
}

// ------------------------------------------------------------------ hành động học

export function recordWritingAttempt(input: WritingInput): WritingResult {
  return commit(recordWriting(getState(), input, systemClock()));
}

export function gradeReviewCard(cardKey: string, grade: Grade, durationMs = 0): GradeResult & { newBadges: string[] } {
  return commit(gradeCard(getState(), cardKey, grade, durationMs, systemClock()));
}

export function submitQuizAnswers(
  quizId: number, answers: Readonly<Record<number, string>>, durationMs: number,
): QuizResult {
  return commit(submitQuiz(getState(), quizId, answers, durationMs, systemClock()));
}

/** Hàng đợi chỉ là ảnh chụp lúc gọi — trang Ôn tập giữ nó cố định trong cả phiên để thẻ không nhảy chỗ giữa chừng. */
export function createReviewQueue(opts: { limit?: number; types?: readonly ItemType[] } = {}): ReviewQueue {
  return buildQueue(getState(), opts, systemClock());
}

// ------------------------------------------------------------------ cài đặt & dữ liệu

export function setDailyGoal(xp: number): void {
  const goal = Math.min(Math.max(Math.round(xp) || 0, MIN_DAILY_GOAL_XP), MAX_DAILY_GOAL_XP);
  const next = structuredClone(getState());
  next.settings.dailyGoalXp = goal;
  commit({ state: next, result: undefined });
}

/** Toàn bộ tiến độ dưới dạng JSON dễ đọc — để người học tự sao lưu hoặc chuyển sang máy khác. */
export function exportProgress(): string {
  return JSON.stringify(getState(), null, 2);
}

/** Thay toàn bộ tiến độ bằng nội dung một tệp đã xuất trước đó. Trả về lỗi (tiếng Việt) nếu tệp không hợp lệ. */
export function importProgress(text: string): { ok: true } | { ok: false; error: string } {
  const parsed = parseState(text);
  if (!parsed.ok) return parsed;
  commit({ state: parsed.state, result: undefined });
  return { ok: true };
}

export function resetProgress(): void {
  commit({ state: emptyState(), result: undefined });
}
