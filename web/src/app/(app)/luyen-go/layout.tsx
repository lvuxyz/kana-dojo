import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Luyện gõ tiếng Nhật",
  description: "Luyện gõ tiếng Nhật bằng romaji, kana JIS hoặc bộ gõ IME theo câu mẫu, có bấm giờ và chấm điểm. Chạy hoàn toàn trên trình duyệt, miễn phí, không cần tài khoản.",
  alternates: { canonical: "/luyen-go" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
