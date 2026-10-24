import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kanji JLPT N5 — âm Hán Việt, chiết tự, thứ tự nét",
  description:
    "Tra Kanji JLPT N5 theo chữ, âm Hán Việt (gõ không dấu) hoặc nghĩa; lọc theo bộ thủ; xem âm On/Kun, chiết tự, cách nhớ, từ ví dụ và tập viết đúng thứ tự nét.",
  alternates: { canonical: "/kanji" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
