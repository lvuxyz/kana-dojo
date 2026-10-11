import { DEFAULT_CONTEXT, type LearnContext } from "../learning/context";
import { LIMITS, SpaceError, emptySpace, learnContextOf, parseSpace, type Space } from "./space";

/* Kho không gian riêng trên localStorage — cùng quy ước với kho tiến độ (lib/learning/store.ts): một khối JSON có
   phiên bản, đồng bộ nhiều tab, giữ lại bản hỏng thay vì ghi đè âm thầm, và vẫn chạy trong bộ nhớ khi trình duyệt
   chặn lưu trữ. Khác biệt duy nhất: ở đây có cả văn bản người dùng tự viết, nên mọi chỗ thất bại ghi đều phải lộ ra
   (`isPersistent`) để giao diện cảnh báo trước khi người học tin rằng ghi chú của mình đã được lưu. */

export const SPACE_KEY = "kd.space.v1";
/** Bản sao khối dữ liệu hỏng, giữ lại để người học còn cứu được. */
export const SPACE_CORRUPT_KEY = "kd.space.corrupt";

/** Dùng khi render phía máy chủ và lúc hydrate. Hook so sánh tham chiếu với hằng này để biết dữ liệu thật đã sẵn sàng. */
export const SERVER_SPACE: Space = emptySpace(0);

let current: Space | null = null;
let persistent = true;
/** Trong kho là dữ liệu của phiên bản mới hơn: tab này không ghi (xem lib/learning/store.ts). */
let newer = false;
let listening = false;
const listeners = new Set<() => void>();

const emit = () => { for (const l of listeners) l(); };

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function load(): Space {
  if (newer) { newer = false; persistent = true; }
  const ls = storage();
  if (!ls) {
    persistent = false;
    return emptySpace();
  }
  let text: string | null;
  try {
    text = ls.getItem(SPACE_KEY);
  } catch {
    persistent = false;
    return emptySpace();
  }
  if (text === null) return emptySpace();

  const parsed = parseSpace(text);
  if (parsed.ok) return parsed.space;
  if (parsed.newer) {
    newer = true;
    persistent = false;
    return emptySpace();
  }
  try { ls.setItem(SPACE_CORRUPT_KEY, text); } catch { /* hết dung lượng — đành chịu */ }
  return emptySpace();
}

function persist(text: string) {
  if (newer) return;
  const ls = storage();
  if (!ls) {
    persistent = false;
    return;
  }
  try {
    ls.setItem(SPACE_KEY, text);
    persistent = true;
  } catch {
    persistent = false;
  }
}

function onStorage(e: StorageEvent) {
  if (e.key !== null && e.key !== SPACE_KEY) return;
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

export function getSpace(): Space {
  if (typeof window === "undefined") return SERVER_SPACE;
  return (current ??= load());
}

export const getServerSpace = (): Space => SERVER_SPACE;

/** false khi lần ghi gần nhất thất bại (đầy bộ nhớ, chế độ riêng tư): thay đổi chỉ sống đến khi đóng tab. */
export const isPersistent = (): boolean => { getSpace(); return persistent; };

/** true khi kho chứa không gian riêng của phiên bản mới hơn — phải tải lại trang. */
export const isNewerData = (): boolean => { getSpace(); return newer; };

function commit(next: Space, text: string = JSON.stringify(next)) {
  current = next;
  persist(text);
  emit();
}

export type UpdateResult = { ok: true } | { ok: false; error: string };

/** Áp một thao tác thuần lên không gian. Thao tác ném SpaceError (vượt giới hạn, câu không gõ được…) thì không đổi gì và
 *  trả lỗi tiếng Việt để hiện cho người học; lỗi khác là lỗi lập trình và được ném tiếp. */
export function updateSpace(fn: (space: Space) => Space): UpdateResult {
  let next: Space;
  try {
    next = fn(getSpace());
  } catch (e) {
    if (e instanceof SpaceError) return { ok: false, error: e.message };
    throw e;
  }
  if (next === getSpace()) return { ok: true };

  // Trần tổng dung lượng: chỉ chặn việc LÀM TO thêm — xoá hay rút gọn luôn được, kể cả khi đang vượt trần (tệp sao lưu lớn).
  const text = JSON.stringify(next);
  if (text.length > LIMITS.totalChars && text.length > JSON.stringify(getSpace()).length) {
    return {
      ok: false,
      error: `Không gian riêng đã đầy (tối đa ${LIMITS.totalChars.toLocaleString("vi-VN")} ký tự). Hãy xoá bớt ghi chú hoặc thẻ không cần, hoặc tải bản sao lưu về rồi dọn dẹp.`,
    };
  }
  commit(next, text);
  return { ok: true };
}

/** Thay toàn bộ không gian (khôi phục từ tệp sao lưu). Trả về false nếu chỉ thay được trong bộ nhớ (ghi thất bại). */
export function replaceSpace(space: Space): boolean {
  commit(space);
  return persistent;
}

/** Về không gian trống, chưa dựng — màn chào lần đầu sẽ hiện lại. */
export function resetSpace(): void {
  commit(emptySpace());
}

// ------------------------------------------------------------------ ngữ cảnh học

let contextFor: Space | null = null;
let context: LearnContext = DEFAULT_CONTEXT;

/** Ngữ cảnh học của không gian hiện tại; cùng một tham chiếu chừng nào không gian chưa đổi (hook cần điều đó). */
export function getLearnContext(): LearnContext {
  const space = getSpace();
  if (space === SERVER_SPACE) return DEFAULT_CONTEXT;
  if (contextFor !== space) {
    contextFor = space;
    context = learnContextOf(space);
  }
  return context;
}

export const getServerLearnContext = (): LearnContext => DEFAULT_CONTEXT;
