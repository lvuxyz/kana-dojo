import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thư viện của tôi",
  description: "Tài liệu, bộ thẻ và câu luyện gõ do chính bạn soạn — lưu ngay trên trình duyệt của bạn.",
};

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
