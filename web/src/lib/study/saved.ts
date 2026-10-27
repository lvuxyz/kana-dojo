import { z } from "zod";
import type { SavedSession } from "./session";

/* Phiên học dở dang, mỗi bộ thẻ tối đa một phiên. Chỉ lưu trên trình duyệt này, không nằm trong tệp sao lưu (giống kỷ lục
 * luyện gõ): đây là chỗ đánh dấu tạm, mất thì người học chỉ phải bắt đầu lại phiên. "Xoá việc học" ở Cài đặt có xoá nó.
 * Phần đọc/kiểm tra là hàm thuần (`parseSaved`); đọc/ghi bộ nhớ nằm ở cuối file. */

export const SAVED_KEY = "kd.study.saved.v1";

const savedSchema = z.object({
  deckId: z.string().min(1),
  order: z.array(z.string()),
  index: z.number().int().min(0),
  results: z.record(z.string(), z.enum(["known", "again"])),
  elapsedMs: z.number().min(0),
  round: z.number().int().min(1),
});

/** Giữ các mục đúng hình dạng, bỏ mục hỏng: một mục sửa tay sai không được làm mất phiên dở của bộ khác. */
export function parseSaved(raw: string | null): Record<string, SavedSession> {
  if (!raw) return {};
  try {
    const all = JSON.parse(raw) as unknown;
    if (!all || typeof all !== "object" || Array.isArray(all)) return {};
    const out: Record<string, SavedSession> = {};
    for (const [deckId, v] of Object.entries(all)) {
      const r = savedSchema.safeParse(v);
      if (r.success && r.data.deckId === deckId && r.data.index < r.data.order.length) out[deckId] = r.data;
    }
    return out;
  } catch {
    return {};
  }
}

function readAll(): Record<string, SavedSession> {
  try {
    return parseSaved(window.localStorage.getItem(SAVED_KEY));
  } catch {
    return {}; // trình duyệt chặn lưu trữ
  }
}

function writeAll(all: Record<string, SavedSession>): boolean {
  try {
    if (Object.keys(all).length === 0) window.localStorage.removeItem(SAVED_KEY);
    else window.localStorage.setItem(SAVED_KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

export function loadSaved(deckId: string): SavedSession | null {
  return readAll()[deckId] ?? null;
}

/**
 * Thêm/thay phiên dở của một bộ và bỏ phiên của những bộ không còn trong `liveDeckIds` — bộ bị xoá ở tab khác (tab này
 * không chạy `clearSaved` cho nó) hoặc qua "Khôi phục từ tệp". Không có bước dọn này, các mục mồ côi nằm mãi trong bộ nhớ.
 */
export function withSaved(
  all: Record<string, SavedSession>,
  s: SavedSession,
  liveDeckIds: readonly string[],
): Record<string, SavedSession> {
  const live = new Set(liveDeckIds);
  const kept = Object.fromEntries(Object.entries(all).filter(([id]) => live.has(id) && id !== s.deckId));
  return { ...kept, [s.deckId]: s };
}

/** `liveDeckIds`: mã các bộ thẻ đang có, để dọn phiên của bộ đã bị xoá. false nếu không ghi được (đầy bộ nhớ hoặc bị chặn). */
export function saveSession(s: SavedSession, liveDeckIds: readonly string[]): boolean {
  return writeAll(withSaved(readAll(), s, liveDeckIds));
}

export function clearSaved(deckId: string): void {
  const all = readAll();
  if (!(deckId in all)) return;
  delete all[deckId];
  writeAll(all);
}

/** Xoá mọi phiên dở (gọi cùng `resetLearning`). */
export function clearAllSaved(): void {
  try {
    window.localStorage.removeItem(SAVED_KEY);
  } catch {
    /* bị chặn lưu trữ: không có gì để xoá */
  }
}
