import { z } from "zod";
import type { ProgressState } from "./learning/state";
import { DAY_MS, dayKey, type Clock } from "./learning/time";

/* Ghi chép riêng của máy này về việc giữ dữ liệu: lần cuối tải bản sao lưu, lần cuối xin trình duyệt lưu bền.
   Không phải dữ liệu của người học nên KHÔNG nằm trong tệp sao lưu (khôi phục trên máy khác không có nghĩa là máy đó đã
   sao lưu). Mất khoá này cũng không sao: tệ nhất là được nhắc sao lưu sớm hơn một lần.

   Vì sao phải nhắc: không có máy chủ, tệp sao lưu là bản duy nhất ngoài trình duyệt. Safari xoá dữ liệu của trang sau
   7 ngày không dùng, trình duyệt nào cũng có thể dọn khi máy hết chỗ (docs/ARCHITECTURE.md › Dữ liệu nằm ở đâu). */

export const DEVICE_KEY = "kd.device.v1";

/** Học ít nhất ngần này ngày kể từ lần sao lưu trước (hoặc từ đầu) thì mới nhắc — học thử một buổi chưa đáng làm phiền. */
export const REMIND_STUDY_DAYS = 3;
/** …và lần sao lưu trước đã cũ ít nhất ngần này. */
export const REMIND_AFTER_MS = 7 * DAY_MS;
/** Bấm "Để sau" thì im lặng ngần này. */
export const SNOOZE_MS = 7 * DAY_MS;
/** Tự xin lưu bền tối đa một lần trong khoảng này: Firefox hỏi người dùng, không nên hỏi lại mỗi lần mở trang. */
export const PERSIST_ASK_EVERY_MS = 30 * DAY_MS;

const deviceSchema = z.object({
  lastBackupAt: z.number().nullable().catch(null),
  backupSnoozeUntil: z.number().nullable().catch(null),
  persistAskedAt: z.number().nullable().catch(null),
});

export type DeviceNotes = z.infer<typeof deviceSchema>;

export const emptyDevice = (): DeviceNotes => ({ lastBackupAt: null, backupSnoozeUntil: null, persistAskedAt: null });

/** Đọc khối ghi chép; hỏng hay thiếu trường thì coi như chưa có gì (không cần giữ bản hỏng — không có gì để cứu). */
export function parseDevice(text: string | null): DeviceNotes {
  if (text === null) return emptyDevice();
  try {
    const parsed = deviceSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : emptyDevice();
  } catch {
    return emptyDevice();
  }
}

/** Số ngày (theo giờ máy) có học kể từ ngày sao lưu — không tính chính ngày đó, vì phần học trong ngày ấy có thể đã nằm trong tệp. */
export function studyDaysSince(state: ProgressState, since: number | null, zone: string): number {
  const from = since === null ? null : dayKey(since, zone);
  return Object.keys(state.daily).filter((d) => from === null || d > from).length;
}

/** Có nên nhắc tải bản sao lưu không. Thuần hàm để test. */
export function shouldRemindBackup(state: ProgressState, notes: DeviceNotes, clock: Clock): boolean {
  if (notes.backupSnoozeUntil !== null && clock.now < notes.backupSnoozeUntil) return false;
  if (notes.lastBackupAt !== null && clock.now - notes.lastBackupAt < REMIND_AFTER_MS) return false;
  return studyDaysSince(state, notes.lastBackupAt, clock.zone) >= REMIND_STUDY_DAYS;
}

/** Có nên tự xin lưu bền lúc này: đã học thật (có thẻ) và chưa hỏi gần đây. */
export function shouldAskPersist(state: ProgressState, notes: DeviceNotes, now: number): boolean {
  if (Object.keys(state.cards).length === 0) return false;
  return notes.persistAskedAt === null || now - notes.persistAskedAt >= PERSIST_ASK_EVERY_MS;
}

// ------------------------------------------------------------------ kho (localStorage)

let current: DeviceNotes | null = null;
let listening = false;
const listeners = new Set<() => void>();
const SERVER_DEVICE = emptyDevice();

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function load(): DeviceNotes {
  try {
    return parseDevice(storage()?.getItem(DEVICE_KEY) ?? null);
  } catch {
    return emptyDevice();
  }
}

function update(patch: Partial<DeviceNotes>) {
  current = { ...getDevice(), ...patch };
  try { storage()?.setItem(DEVICE_KEY, JSON.stringify(current)); } catch { /* bị chặn hoặc hết chỗ: vẫn nhớ trong tab */ }
  for (const l of listeners) l();
}

function onStorage(e: StorageEvent) {
  if (e.key !== null && e.key !== DEVICE_KEY) return;
  current = load();
  for (const l of listeners) l();
}

export function subscribeDevice(listener: () => void): () => void {
  listeners.add(listener);
  if (!listening && typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
    listening = true;
  }
  return () => { listeners.delete(listener); };
}

export function getDevice(): DeviceNotes {
  if (typeof window === "undefined") return SERVER_DEVICE;
  return (current ??= load());
}

export const getServerDevice = (): DeviceNotes => SERVER_DEVICE;

/** Gọi sau khi tải bản sao lưu về máy, hoặc sau khi khôi phục từ tệp (dữ liệu lúc đó đúng bằng một tệp đang có). */
export const markBackedUp = (now: number = Date.now()): void => update({ lastBackupAt: now, backupSnoozeUntil: null });

/** Đọc lại từ localStorage — sau "Xoá sạch mọi thứ" (khoá đã bị xoá cùng mọi khoá `kd.*`). */
export function reloadDevice(): void {
  current = load();
  for (const l of listeners) l();
}

export const snoozeBackupReminder = (now: number = Date.now()): void => update({ backupSnoozeUntil: now + SNOOZE_MS });

// ------------------------------------------------------------------ lưu bền (navigator.storage)

/** - `persisted`: trình duyệt hứa không tự dọn dữ liệu của trang khi thiếu chỗ (người dùng vẫn tự xoá được).
 *  - `best-effort`: có thể bị dọn khi máy thiếu chỗ.
 *  - `unsupported`: không có `navigator.storage` (trình duyệt cũ, hoặc trang không chạy trên HTTPS/localhost). */
export type Protection = "persisted" | "best-effort" | "unsupported";

export interface StorageStatus {
  protection: Protection;
  /** Byte trình duyệt tính cho cả trang (localStorage, tệp offline của service worker…). Ước lượng, có thể làm tròn. */
  usage: number | null;
  quota: number | null;
}

const storageManager = (): StorageManager | null =>
  typeof navigator !== "undefined" && navigator.storage && typeof navigator.storage.persisted === "function"
    ? navigator.storage
    : null;

export async function readStorageStatus(): Promise<StorageStatus> {
  const sm = storageManager();
  if (!sm) return { protection: "unsupported", usage: null, quota: null };
  const [persisted, estimate] = await Promise.all([
    sm.persisted().catch(() => false),
    typeof sm.estimate === "function" ? sm.estimate().catch(() => null) : Promise.resolve(null),
  ]);
  return {
    protection: persisted ? "persisted" : "best-effort",
    usage: estimate?.usage ?? null,
    quota: estimate?.quota ?? null,
  };
}

/** Xin lưu bền. Chrome/Edge/Safari tự quyết theo mức gắn bó với trang (đã cài, hay mở…), không hỏi; Firefox hỏi người dùng.
 *  Trả về trạng thái sau khi xin. */
export async function requestPersistence(now: number = Date.now()): Promise<Protection> {
  const sm = storageManager();
  if (!sm || typeof sm.persist !== "function") return "unsupported";
  update({ persistAskedAt: now });
  try {
    return (await sm.persist()) ? "persisted" : "best-effort";
  } catch {
    return "best-effort";
  }
}

/** Tự xin lưu bền một lần khi người học đã có tiến độ (gọi lúc mở trang). Đã được bảo vệ thì thôi, không ghi gì. */
export async function ensurePersistence(state: ProgressState, now: number = Date.now()): Promise<void> {
  const sm = storageManager();
  if (!sm || !shouldAskPersist(state, getDevice(), now)) return;
  if (await sm.persisted().catch(() => true)) return;
  await requestPersistence(now);
}

/** Byte mà các khoá `kd.*` chiếm trong localStorage (2 byte/ký tự, như cách tài liệu nêu mốc 5 MiB). */
export function localDataBytes(): number | null {
  const ls = storage();
  if (!ls) return null;
  try {
    let chars = 0;
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k?.startsWith("kd.")) chars += k.length + (ls.getItem(k)?.length ?? 0);
    }
    return chars * 2;
  } catch {
    return null;
  }
}

/** Mức mà mọi trình duyệt lớn cho localStorage của một origin. */
export const LOCAL_STORAGE_BUDGET = 5 * 1024 * 1024;
