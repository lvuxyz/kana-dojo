import type { MetadataRoute } from "next";

export const dynamic = "force-static";

/* Web app manifest — cho phép cài Kana Dōjō ra màn hình chính như một ứng dụng.
   Chrome/Edge yêu cầu tối thiểu: name, icon 192 + 512, start_url, display, và HTTPS. Safari trên iOS không cần manifest
   để "Thêm vào Màn hình chính" (theo MDN); icon cảm ứng riêng nằm ở app/apple-icon.png. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Kana Dōjō — Học viết Hiragana & Katakana",
    short_name: "Kana Dōjō",
    description: "Luyện viết Hiragana và Katakana đúng thứ tự nét, tự xếp lịch ôn bằng FSRS, và một dōjō riêng do chính bạn soạn. Miễn phí, không cần tài khoản.",
    lang: "vi",
    // Người đã cài là người quay lại học: vào thẳng tổng quan thay vì trang giới thiệu.
    start_url: "/bang-dieu-khien",
    scope: "/",
    display: "standalone",
    background_color: "#faf9f6",
    theme_color: "#faf9f6",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Thư viện của tôi", url: "/thu-vien" },
      { name: "Luyện viết", url: "/luyen-viet" },
      { name: "Luyện gõ", url: "/luyen-go" },
      { name: "Ôn tập", url: "/on-tap" },
      { name: "Quiz", url: "/quiz" },
    ],
  };
}
