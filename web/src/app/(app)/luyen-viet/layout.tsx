import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Luyện viết Hiragana & Katakana",
  description: "Tập viết Hiragana và Katakana trên lưới ô vuông, được chấm điểm từng nét và tự xếp lịch ôn bằng FSRS. Miễn phí, không cần tài khoản.",
  alternates: { canonical: "/luyen-viet" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
