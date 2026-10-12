import { reloadDevice } from "./device";
import { parseStateValue, type ProgressState } from "./learning/state";
import {
  getState, isNewerData as progressIsNewer, isPersistent as progressPersistent, replaceProgress, resetProgress,
} from "./learning/store";
import { parseSpaceValue, type Space } from "./space/space";
import {
  getSpace, isNewerData as spaceIsNewer, isPersistent as spacePersistent, replaceSpace, resetSpace,
} from "./space/store";
import { clearAllSaved } from "./study/saved";
import { clearHistory } from "./typing/history";

/* Tệp sao lưu: toàn bộ thứ thuộc về người học trên thiết bị này, trong một tệp JSON.

   Định dạng 2 (bọc):  { app, format: 2, exportedAt, progress: <tệp tiến độ v1>, space: <không gian riêng> }
   Định dạng cũ:       một tệp tiến độ v1 trần (docs/CONTRACT.md §2) — vẫn nhập được, chỉ thay phần tiến độ.

   Vì sao bọc thay vì nhét thêm trường vào tệp tiến độ: bản Kana Dōjō cũ đọc tệp bọc sẽ thấy "sai định dạng" và từ chối
   rõ ràng, thay vì nhập phần tiến độ rồi âm thầm vứt tài liệu của người học. Phần `progress` bên trong giữ nguyên
   ProgressState v1 từng byte, nên hợp đồng web ↔ mobile không đổi.
   Kỷ lục luyện gõ vẫn lưu riêng, chưa nằm trong tệp (quyết định đã chốt ở docs/TYPING.md §3.4). */

export const BACKUP_FORMAT = 2;
const APP = "kana-dojo";

export interface BackupFile {
  app: typeof APP;
  format: typeof BACKUP_FORMAT;
  exportedAt: string;
  progress: ProgressState;
  space: Space;
}

export type BackupParse =
  | { ok: true; kind: "full"; progress: ProgressState; space: Space }
  | { ok: true; kind: "progress-only"; progress: ProgressState }
  | { ok: false; error: string };

export function buildBackup(progress: ProgressState, space: Space, now: Date = new Date()): string {
  const file: BackupFile = { app: APP, format: BACKUP_FORMAT, exportedAt: now.toISOString(), progress, space };
  return JSON.stringify(file, null, 2);
}

export function parseBackup(text: string): BackupParse {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "Tệp không phải JSON hợp lệ." };
  }

  const format = (raw as { format?: unknown } | null)?.format;
  if (format === undefined) {
    // Tệp tiến độ trần của bản cũ.
    const progress = parseStateValue(raw);
    return progress.ok ? { ok: true, kind: "progress-only", progress: progress.state } : progress;
  }
  if (typeof format !== "number" || format > BACKUP_FORMAT) {
    return { ok: false, error: "Tệp được tạo bởi phiên bản Kana Dōjō mới hơn. Hãy tải lại trang để cập nhật rồi thử lại." };
  }
  const file = raw as { app?: unknown; progress?: unknown; space?: unknown };
  if (format !== BACKUP_FORMAT || file.app !== APP) return { ok: false, error: "Tệp không phải tệp sao lưu của Kana Dōjō." };

  const progress = parseStateValue(file.progress);
  if (!progress.ok) return progress;
  const space = parseSpaceValue(file.space);
  if (!space.ok) return space;
  return { ok: true, kind: "full", progress: progress.state, space: space.space };
}

// ------------------------------------------------------------------ thao tác trên kho

export const exportBackup = (now: Date = new Date()): string => buildBackup(getState(), getSpace(), now);

const NO_ROOM =
  "Trình duyệt không đủ dung lượng để khôi phục tệp này nên chưa có gì bị thay đổi. Hãy giải phóng dung lượng " +
  "(hoặc dọn bớt ghi chú, bộ thẻ trong tệp) rồi thử lại.";
const OLD_TAB =
  "Tab này đang chạy phiên bản Kana Dōjō cũ hơn dữ liệu trên trình duyệt. Hãy đóng mọi tab Kana Dōjō rồi mở lại trước khi khôi phục.";

/** Kiểm tra toàn bộ tệp TRƯỚC khi ghi bất cứ thứ gì: tệp hỏng không bao giờ làm mất một nửa dữ liệu hiện có.
 *  Ghi cũng là "tất cả hoặc không gì cả": hai kho là hai lần ghi localStorage riêng, nên nếu lần sau thất bại (hết dung
 *  lượng) thì lần trước được hoàn lại — không bao giờ để lại tiến độ của tệp đi với tài liệu cũ hay ngược lại.
 *  Trình duyệt vốn đã không lưu được (chế độ riêng tư, bị chặn) thì vẫn khôi phục vào bộ nhớ như trước; banner đã cảnh báo. */
export function importBackup(text: string): { ok: true; kind: "full" | "progress-only" } | { ok: false; error: string } {
  const parsed = parseBackup(text);
  if (!parsed.ok) return parsed;
  if (progressIsNewer() || spaceIsNewer()) return { ok: false, error: OLD_TAB };

  const full = parsed.kind === "full";
  if (!progressPersistent() || !spacePersistent()) {
    replaceProgress(parsed.progress);
    if (full) replaceSpace(parsed.space);
    return { ok: true, kind: parsed.kind };
  }

  const before = { progress: getState(), space: getSpace() };
  // Không gian riêng (có văn bản người dùng, lớn hơn) ghi trước: hết chỗ thì dừng khi tiến độ chưa bị đụng tới.
  if (full && !replaceSpace(parsed.space)) {
    replaceSpace(before.space);
    return { ok: false, error: NO_ROOM };
  }
  if (!replaceProgress(parsed.progress)) {
    replaceProgress(before.progress);
    if (full) replaceSpace(before.space);
    return { ok: false, error: NO_ROOM };
  }
  return { ok: true, kind: parsed.kind };
}

/** Xoá việc học (tiến độ, huy hiệu, kỷ lục gõ, phiên học dở), GIỮ tài liệu, bộ thẻ và cài đặt của người học. */
export function resetLearning(): void {
  resetProgress();
  clearHistory();
  clearAllSaved();
}

/** Tuỳ chọn hiển thị của máy (sáng/tối), không phải dữ liệu của người học: giữ lại để trang không chớp đổi màu. */
const KEPT_KEYS = new Set(["kd.theme"]);

/** Xoá sạch mọi thứ trên trình duyệt này, kể cả không gian riêng: mọi khoá `kd.*` (lựa chọn màn luyện gõ, bản hỏng giữ
 *  để cứu hộ, và cả khoá do bản sau thêm vào) trừ giao diện sáng/tối. */
export function resetEverything(): void {
  try {
    const ls = window.localStorage;
    const keys: string[] = [];
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k?.startsWith("kd.") && !KEPT_KEYS.has(k)) keys.push(k);
    }
    for (const k of keys) ls.removeItem(k);
  } catch {
    /* bị chặn lưu trữ: không có gì để xoá */
  }
  resetLearning();
  resetSpace();
  reloadDevice();
}
