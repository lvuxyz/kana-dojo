import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/bang-chu-cai/hiragana`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/bang-chu-cai/katakana`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    // [máy chủ — đang tắt] Chế độ cá nhân không có tài khoản: /dang-ky chuyển thẳng vào ứng dụng (docs/LOCAL_MODE.md).
    // [máy chủ — đang tắt] { url: `${base}/dang-ky`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
  ];
}
