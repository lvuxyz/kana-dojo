import { parseStateValue, type ProgressState } from "./learning/state";
import { getState, replaceProgress, resetProgress } from "./learning/store";
import { parseSpaceValue, type Space } from "./space/space";
import { getSpace, replaceSpace, resetSpace } from "./space/store";
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

/** Kiểm tra toàn bộ tệp TRƯỚC khi ghi bất cứ thứ gì: tệp hỏng không bao giờ làm mất một nửa dữ liệu hiện có. */
export function importBackup(text: string): { ok: true; kind: "full" | "progress-only" } | { ok: false; error: string } {
  const parsed = parseBackup(text);
  if (!parsed.ok) return parsed;
  replaceProgress(parsed.progress);
  if (parsed.kind === "full") replaceSpace(parsed.space);
  return { ok: true, kind: parsed.kind };
}

/** Xoá việc học (tiến độ, huy hiệu, kỷ lục gõ), GIỮ tài liệu, bộ thẻ và cài đặt của người học. */
export function resetLearning(): void {
  resetProgress();
  clearHistory();
}

/** Xoá sạch mọi thứ trên trình duyệt này, kể cả không gian riêng. */
export function resetEverything(): void {
  resetLearning();
  resetSpace();
}
