/* =============================================================================
   So khớp nét viết tay với đường tâm nét chuẩn của KanjiVG.
   Thuần hàm, không chạm DOM — nhờ vậy unit test được bằng Node.
   Mọi toạ độ tính trong hệ 109×109 của KanjiVG (1 đơn vị ≈ 0.92% cạnh ô).
   ========================================================================== */

export interface Pt { x: number; y: number }

export function dist(a: Pt, b: Pt): number {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function polyLen(p: Pt[]): number {
  let t = 0;
  for (let i = 1; i < p.length; i++) t += dist(p[i - 1], p[i]);
  return t;
}

/** Lấy lại n điểm cách đều nhau THEO ĐỘ DÀI CUNG.
 *  Đây là bước then chốt: hai người vẽ cùng một nét với tốc độ và số điểm hoàn
 *  toàn khác nhau; chuẩn hoá theo độ dài cung đưa cả hai về cùng một tham số
 *  hoá, nhờ đó so từng cặp điểm mới có nghĩa — rẻ hơn DTW rất nhiều mà kết quả
 *  tương đương với nét đơn. */
export function resample(p: Pt[], n: number): Pt[] {
  if (p.length === 0) return [];
  if (p.length === 1) return Array.from({ length: n }, () => p[0]);

  const acc = [0];
  let total = 0;
  for (let i = 1; i < p.length; i++) {
    total += dist(p[i - 1], p[i]);
    acc.push(total);
  }
  if (total === 0) return Array.from({ length: n }, () => p[0]);

  const out: Pt[] = [];
  let j = 1;
  for (let i = 0; i < n; i++) {
    const target = (total * i) / (n - 1);
    while (j < acc.length - 1 && acc[j] < target) j++;
    const span = acc[j] - acc[j - 1];
    const t = span > 0 ? (target - acc[j - 1]) / span : 0;
    out.push({
      x: p[j - 1].x + (p[j].x - p[j - 1].x) * t,
      y: p[j - 1].y + (p[j].y - p[j - 1].y) * t,
    });
  }
  return out;
}

const N_CMP = 24;

export type StrokeErrorReason = "REVERSED" | "TOO_SHORT" | "TOO_LONG" | "OFF_PATH" | null;

export interface StrokeScore {
  /** 0–100 */
  score: number;
  /** Sai lệch trung bình, đơn vị ô 109 */
  dev: number;
  reversed: boolean;
  /** độ dài nét người dùng / độ dài nét mẫu */
  ratio: number;
  reason: StrokeErrorReason;
}

/** Chấm một nét. Điểm LUÔN tính theo chiều xuôi.
 *  Lấy min(xuôi, ngược) là lỗi kinh điển: nó vô tình thưởng điểm cho nét vẽ
 *  ngược chiều. Chiều ngược chỉ dùng để CHẨN ĐOÁN và báo lỗi cho người học. */
export function scoreStroke(user: Pt[], target: Pt[], targetLen: number): StrokeScore {
  const U = resample(user, N_CMP);
  const T = resample(target, N_CMP);

  let fwd = 0, rev = 0;
  for (let i = 0; i < N_CMP; i++) {
    fwd += dist(U[i], T[i]);
    rev += dist(U[i], T[N_CMP - 1 - i]);
  }
  fwd /= N_CMP;
  rev /= N_CMP;

  const reversed = rev < fwd - 1.2;
  const ratio = polyLen(user) / (targetLen || 1);
  const lenPenalty = Math.abs(Math.log(Math.max(0.05, Math.min(20, ratio)))) * 15;
  const score = Math.max(0, Math.min(100, Math.round(100 - fwd * 4.2 - lenPenalty)));

  let reason: StrokeErrorReason = null;
  if (reversed) reason = "REVERSED";
  else if (ratio < 0.5) reason = "TOO_SHORT";
  else if (ratio > 1.9) reason = "TOO_LONG";
  else if (fwd > 15) reason = "OFF_PATH";

  return { score, dev: fwd, reversed, ratio, reason };
}

export const PASS_THRESHOLD = { trace: 58, test: 48 } as const;

const DIRS = [
  "từ trái sang phải", "chéo xuống bên phải", "từ trên xuống dưới", "chéo xuống bên trái",
  "từ phải sang trái", "chéo lên bên trái", "từ dưới lên trên", "chéo lên bên phải",
];

export function dirText(a: Pt, b: Pt): string {
  const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  return DIRS[(Math.round(ang / 45) + 8) % 8];
}

export function posText(p: Pt, viewBox: number): string {
  const x = p.x - Math.floor(p.x / viewBox) * viewBox;
  const v = p.y < viewBox * 0.38 ? "phía trên" : p.y > viewBox * 0.63 ? "phía dưới" : "khoảng giữa";
  const h = x < viewBox * 0.38 ? " bên trái" : x > viewBox * 0.63 ? " bên phải" : "";
  return v + h;
}
