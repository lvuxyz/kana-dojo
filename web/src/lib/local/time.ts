/** Phép tính ngày theo múi giờ của người học — streak và mục tiêu ngày dùng ngày địa phương, không dùng UTC. */

/** Múi giờ chuẩn của giải đấu, cố định cho mọi người chơi (xem LeaderboardService). */
export const LEAGUE_ZONE = "Asia/Ho_Chi_Minh";

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(zone: string): Intl.DateTimeFormat {
  let f = dateFormatters.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
    });
    dateFormatters.set(zone, f);
  }
  return f;
}

export function isValidTimezone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

function parts(zone: string, ms: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of formatterFor(zone).formatToParts(ms)) out[p.type] = p.value;
  return out;
}

/** Ngày địa phương dạng `YYYY-MM-DD` của một thời điểm. */
export function localDate(zone: string, ms: number): string {
  const p = parts(zone, ms);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Giờ địa phương 0..23. */
export function localHour(zone: string, ms: number): number {
  return Number(parts(zone, ms).hour) % 24;
}

const utcMs = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

export function addDays(date: string, n: number): string {
  return new Date(utcMs(date) + n * 86_400_000).toISOString().slice(0, 10);
}

/** Số ngày từ `a` đến `b` (dương nếu b sau a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((utcMs(b) - utcMs(a)) / 86_400_000);
}

/** Thứ Hai của tuần chứa `date` (previousOrSame(MONDAY)). */
export function mondayOf(date: string): string {
  const dow = new Date(utcMs(date)).getUTCDay(); // 0 = CN
  return addDays(date, -((dow + 6) % 7));
}
