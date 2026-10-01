/* Mọi phép tính "ngày" của bộ máy học đi qua đây.
   Ngày là chuỗi "YYYY-MM-DD" theo múi giờ của máy người học, không phải UTC: người học ở Việt Nam
   kết thúc ngày lúc 00:00 giờ VN; dùng UTC thì chuỗi ngày sẽ đứt lúc 7 giờ sáng. */

export const DAY_MS = 86_400_000;

/** Thời điểm và múi giờ dùng cho một thao tác. Tách riêng để test đặt được giờ giả. */
export interface Clock { now: number; zone: string }

export function deviceZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function systemClock(): Clock {
  return { now: Date.now(), zone: deviceZone() };
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function partsOf(ms: number, zone: string) {
  let f = formatters.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
    });
    formatters.set(zone, f);
  }
  const p: Record<string, string> = {};
  for (const part of f.formatToParts(ms)) p[part.type] = part.value;
  return p;
}

/** Ngày địa phương dạng "2026-09-07". */
export function dayKey(ms: number, zone: string): string {
  const p = partsOf(ms, zone);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Giờ địa phương 0–23. */
export function hourOf(ms: number, zone: string): number {
  return Number(partsOf(ms, zone).hour) % 24;
}

/** Số ngày kể từ epoch của một khoá ngày — chỉ để lấy hiệu giữa hai ngày, không phụ thuộc múi giờ. */
function dayIndex(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

/** b − a tính bằng ngày. */
export function daysBetween(a: string, b: string): number {
  return dayIndex(b) - dayIndex(a);
}

export function addDays(key: string, n: number): string {
  return new Date((dayIndex(key) + n) * DAY_MS).toISOString().slice(0, 10);
}

/** Khoá ngày Thứ Hai của tuần chứa ngày này — mốc hồi thẻ băng streak hằng tuần. */
export function weekStart(key: string): string {
  const dow = new Date(dayIndex(key) * DAY_MS).getUTCDay(); // 0 = Chủ nhật
  return addDays(key, -((dow + 6) % 7));
}
