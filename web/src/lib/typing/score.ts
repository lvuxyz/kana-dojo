/* Chấm điểm luyện gõ — hàm thuần, chạy hoàn toàn trên trình duyệt. Công thức giữ khớp từng bit với
 * TypingScoring.java (mã đồng bộ máy chủ, đang tắt) để khi bật lại, điểm client và server không lệch. */

/** Bài mẫu (bấm giờ đến khi xong), đua giờ (đếm ngược), sinh tử (sai một phím là dừng). */
export type TypingMode = "PASSAGE" | "TIME_ATTACK" | "SUDDEN_DEATH";

/** Phím đúng mỗi phút (打鍵/分) — thước đo chuẩn của các bài kiểm tra gõ phím tiếng Nhật. */
export function kpm(correctKeys: number, durationMs: number): number {
  return durationMs > 0 ? (correctKeys * 60_000) / durationMs : 0;
}

export function accuracy(correctKeys: number, missKeys: number): number {
  const total = correctKeys + missKeys;
  return total === 0 ? 1 : correctKeys / total;
}

/**
 * Điểm = KPM × (độ chính xác)³ — cách e-typing chấm: gõ nhanh mà ẩu bị phạt rất nặng
 * (chính xác 90% chỉ còn 73% điểm), nên người học được khuyến khích gõ chắc trước khi gõ nhanh.
 * Chế độ sinh tử đo độ bền nên điểm là số phím đúng liên tiếp trước khi sai.
 */
export function typingScore(mode: TypingMode, correctKeys: number, missKeys: number, durationMs: number): number {
  if (mode === "SUDDEN_DEATH") return correctKeys;
  const acc = accuracy(correctKeys, missKeys);
  // Nhân tay thay vì ** 3 để làm tròn giống hệt Java.
  return Math.round(kpm(correctKeys, durationMs) * acc * acc * acc);
}

export interface Belt {
  min: number;
  ja: string;
  vi: string;
  /** Màu dải đai (CSS) */
  color: string;
}

/** Xếp hạng theo đai võ — hợp với chủ đề "đạo trường". Mốc tham khảo: người Nhật văn phòng gõ
 *  romaji khoảng 150–250 phím/phút, người mới học kana thường bắt đầu dưới 60. */
export const BELTS: Belt[] = [
  { min: 0, ja: "白帯", vi: "Đai trắng", color: "#e9e6de" },
  { min: 60, ja: "黄帯", vi: "Đai vàng", color: "#e8c547" },
  { min: 100, ja: "緑帯", vi: "Đai xanh lá", color: "#3f9b5f" },
  { min: 150, ja: "青帯", vi: "Đai xanh dương", color: "#3a78c2" },
  { min: 200, ja: "茶帯", vi: "Đai nâu", color: "#8a5a36" },
  { min: 260, ja: "黒帯", vi: "Đai đen", color: "#1d1d1d" },
  { min: 330, ja: "師範", vi: "Sư phụ", color: "#cf2f1d" },
  { min: 400, ja: "達人", vi: "Cao thủ", color: "#b07d14" },
  { min: 500, ja: "名人", vi: "Bậc thầy", color: "#7a3fb0" },
];

export function beltFor(score: number): Belt {
  let belt = BELTS[0];
  for (const b of BELTS) if (score >= b.min) belt = b;
  return belt;
}

export function nextBelt(score: number): Belt | undefined {
  return BELTS.find((b) => b.min > score);
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, ms) / 1000;
  const m = Math.floor(total / 60);
  const s = total - m * 60;
  return m > 0 ? `${m}:${s.toFixed(1).padStart(4, "0")}` : `${s.toFixed(1)}s`;
}
