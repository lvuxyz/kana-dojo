import type { BadgeDef } from "@/lib/types";

/** Danh mục huy hiệu. Điều kiện trao nằm ở lib/learning/badges.ts. */
export const BADGES: BadgeDef[] = [
  { code: "FIRST_STROKE", nameVi: "Nét đầu tiên", descriptionVi: "Viết đạt ký tự kana đầu tiên của bạn.", icon: "✏️", tier: "BRONZE" },
  { code: "HIRAGANA_MASTER", nameVi: "Bậc thầy Hiragana", descriptionVi: "Thuộc đủ 46 ký tự hiragana cơ bản.", icon: "🌸", tier: "GOLD" },
  { code: "KATAKANA_MASTER", nameVi: "Bậc thầy Katakana", descriptionVi: "Thuộc đủ 46 ký tự katakana cơ bản.", icon: "🗻", tier: "GOLD" },
  { code: "STREAK_7", nameVi: "Kiên trì 7 ngày", descriptionVi: "Đạt mục tiêu học 7 ngày liên tiếp.", icon: "🔥", tier: "BRONZE" },
  { code: "STREAK_30", nameVi: "Kiên trì 30 ngày", descriptionVi: "Đạt mục tiêu học 30 ngày liên tiếp.", icon: "🔥", tier: "SILVER" },
  { code: "STREAK_100", nameVi: "Kiên trì 100 ngày", descriptionVi: "Đạt mục tiêu học 100 ngày liên tiếp.", icon: "🔥", tier: "GOLD" },
  { code: "PERFECT_10", nameVi: "Mười điểm tuyệt đối", descriptionVi: "10 ký tự liên tiếp được chấm từ 95 điểm trở lên.", icon: "💯", tier: "SILVER" },
  { code: "NIGHT_OWL", nameVi: "Cú đêm", descriptionVi: "Học sau 23 giờ theo giờ địa phương của bạn.", icon: "🦉", tier: "BRONZE" },
  { code: "REVIEW_1000", nameVi: "Nghìn lượt ôn", descriptionVi: "Hoàn thành tổng cộng 1000 lượt ôn tập.", icon: "📚", tier: "GOLD" },
];
