import type { Metadata, Viewport } from "next";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Kana Dōjō — Học viết Hiragana & Katakana đúng nét",
    template: "%s · Kana Dōjō",
  },
  description:
    "Luyện viết Hiragana và Katakana trên lưới giấy ô vuông Nhật. Máy chấm điểm từng nét, tự lên lịch ôn theo thuật toán FSRS. Miễn phí, học trực tiếp trên trình duyệt.",
  keywords: ["học tiếng Nhật", "hiragana", "katakana", "bảng chữ cái tiếng Nhật", "tập viết kana", "thứ tự nét"],
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "Kana Dōjō",
    title: "Kana Dōjō — Học viết Hiragana & Katakana đúng nét",
    description: "Máy chấm từng nét viết của bạn và tự lên lịch ôn tập. Học trực tiếp trên trình duyệt.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f2" },
    { media: "(prefers-color-scheme: dark)", color: "#141815" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Zen+Old+Mincho:wght@400;600&display=swap"
        />
        {/* Đọc lựa chọn giao diện trước khi vẽ khung hình đầu tiên, tránh chớp sáng */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("kd.theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}`,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
