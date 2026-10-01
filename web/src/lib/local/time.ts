/* Tiện ích ngày giờ theo MÚI GIỜ CỦA NGƯỜI HỌC — bản port của common/LocalDay.java.
   Ngày được biểu diễn bằng chuỗi "YYYY-MM-DD" để so sánh và lưu trữ không phụ thuộc múi giờ máy. */

/** Múi giờ hợp lệ, nếu không thì trả về `fallback`. */
export function safeZone(zone: string | null | undefined, fallback: string): string {
  if (!zone) return fallback;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return zone;
  } catch {
    return fallback;
  }
}

/** Múi giờ của trình duyệt (rơi về giờ Việt Nam nếu không đọc được). */
export function browserZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh";
  } catch {
    return "Asia/Ho_Chi_Minh";
  }
}

/** Ngày địa phương tại `zone` của một thời điểm, dạng "YYYY-MM-DD". */
export function dateInZone(zone: string, at: Date): string {
  // en-CA cho đúng định dạng năm-tháng-ngày.
  return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

/** Giờ (0–23) địa phương tại `zone`. */
export function hourInZone(zone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", hourCycle: "h23" }).formatToParts(at);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "0";
  return Number(hour) % 24;
}

function toUtc(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(date: string, days: number): string {
  return new Date(toUtc(date) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Số ngày từ `a` đến `b` (dương nếu b sau a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

/** Thứ Hai đầu tuần chứa `date`. */
export function mondayOf(date: string): string {
  const dow = new Date(toUtc(date)).getUTCDay(); // 0 = Chủ nhật
  return addDays(date, -((dow + 6) % 7));
}
