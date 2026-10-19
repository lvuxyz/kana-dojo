import type { MetadataRoute } from "next";
import { QUIZZES } from "@/data/quizzes";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/bang-chu-cai/hiragana`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/bang-chu-cai/katakana`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/luyen-viet`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/luyen-go`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/tu-vung`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/kanji`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/quiz`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    ...QUIZZES.map((q) => ({ url: `${base}/quiz/${q.id}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
