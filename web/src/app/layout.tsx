import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/app/ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001"),
  title: {
    default: "Kana Dōjō — Học viết Hiragana & Katakana đúng nét",
    template: "%s · Kana Dōjō",
  },
  description:
    "Luyện viết Hiragana và Katakana trên lưới giấy ô vuông Nhật, máy chấm từng nét, tự lên lịch ôn theo FSRS — và mỗi người có một dōjō riêng: tự soạn ghi chú, bộ thẻ, câu luyện gõ. Miễn phí, không cần tài khoản.",
  keywords: ["học tiếng Nhật", "hiragana", "katakana", "bảng chữ cái tiếng Nhật", "tập viết kana", "thứ tự nét"],
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "Kana Dōjō",
    title: "Kana Dōjō — Học viết Hiragana & Katakana đúng nét",
    description: "Máy chấm từng nét viết của bạn, tự lên lịch ôn tập, và một dōjō riêng do chính bạn soạn. Học trực tiếp trên trình duyệt.",
  },
  robots: { index: true, follow: true },
  applicationName: "Kana Dōjō",
  // Safari iOS: mở toàn màn hình khi chạy từ biểu tượng ngoài màn hình chính. Icon cảm ứng lấy từ app/apple-icon.png.
  appleWebApp: { capable: true, title: "Kana Dōjō", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1412" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Root layout của App Router áp cho mọi trang; quy tắc này chỉ đúng với pages/_document. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Zen+Old+Mincho:wght@400;600;700;900&display=swap"
        />
        {/* Đọc lựa chọn giao diện trước khi vẽ khung hình đầu tiên, tránh chớp sáng */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("kd.theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}`,
          }}
        />
      </head>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
