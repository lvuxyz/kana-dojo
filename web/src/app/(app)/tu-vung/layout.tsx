import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Từ vựng JLPT N5–N4",
  description: "Danh sách từ vựng JLPT N5 và N4 kèm cách đọc, nghĩa tiếng Việt và câu ví dụ. Tìm kiếm không cần gõ dấu.",
  alternates: { canonical: "/tu-vung" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
