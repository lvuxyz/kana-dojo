import type { ModuleId, Space, WidgetId } from "./space";

/* Siêu dữ liệu giao diện của các công cụ: đường dẫn, nhãn, biểu tượng, mô tả. Thứ tự và việc bật/tắt do người học quyết định
   và nằm trong Space (`space.modules`); file này chỉ nói mỗi mô-đun LÀ gì. */

export interface ModuleInfo {
  id: ModuleId;
  href: string;
  label: string;
  icon: "home" | "review" | "brush" | "keyboard" | "book" | "quiz" | "library" | "settings";
  blurb: string;
}

export const MODULE_INFO: Record<ModuleId, ModuleInfo> = {
  home: { id: "home", href: "/bang-dieu-khien", label: "Tổng quan", icon: "home", blurb: "Chuỗi ngày, mục tiêu, huy hiệu và ghi chú bạn ghim." },
  review: { id: "review", href: "/on-tap", label: "Ôn tập", icon: "review", blurb: "Ôn thẻ đến hạn theo lịch FSRS." },
  writing: { id: "writing", href: "/luyen-viet", label: "Luyện viết", icon: "brush", blurb: "Viết kana trên lưới, máy chấm từng nét." },
  library: { id: "library", href: "/thu-vien", label: "Thư viện", icon: "library", blurb: "Ghi chú, bộ thẻ và câu luyện gõ của riêng bạn." },
  typing: { id: "typing", href: "/luyen-go", label: "Luyện gõ", icon: "keyboard", blurb: "Gõ tiếng Nhật, bấm giờ và chấm điểm." },
  vocab: { id: "vocab", href: "/tu-vung", label: "Từ vựng", icon: "book", blurb: "Từ JLPT có sẵn; thêm vào bộ thẻ của bạn." },
  quiz: { id: "quiz", href: "/quiz", label: "Quiz", icon: "quiz", blurb: "Bài kiểm tra có sẵn, có đồng hồ và giải thích." },
  settings: { id: "settings", href: "/cai-dat", label: "Cài đặt", icon: "settings", blurb: "Không gian của bạn, cách học và sao lưu." },
};

/** Các mục điều hướng theo đúng thứ tự người học đã chọn. */
export const navItemsOf = (space: Pick<Space, "modules">): ModuleInfo[] => space.modules.map((id) => MODULE_INFO[id]);

export const WIDGET_INFO: Record<WidgetId, { label: string; blurb: string }> = {
  today: { label: "Việc hôm nay", blurb: "Lối vào ôn tập, luyện viết, luyện gõ." },
  stats: { label: "Số liệu", blurb: "Chuỗi ngày, cấp độ, kana đã thuộc, tổng XP." },
  goal: { label: "Mục tiêu XP", blurb: "Thanh tiến độ mục tiêu trong ngày." },
  heatmap: { label: "Sổ điểm danh", blurb: "16 tuần gần nhất, mỗi ô một ngày." },
  badges: { label: "Huy hiệu", blurb: "Các huy hiệu đã đạt và còn lại." },
  notes: { label: "Ghi chú đã ghim", blurb: "Ghi chú bạn ghim trong Thư viện." },
};
