import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/bang-chu-cai/hiragana`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/bang-chu-cai/katakana`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/dang-ky`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
  ];
}
