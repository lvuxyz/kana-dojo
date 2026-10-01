import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ôn tập",
  // Trang cá nhân hoá — không có nội dung công khai để lập chỉ mục.
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
