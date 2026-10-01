import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
  return {
    // Ba trang này chỉ hiện tiến độ cá nhân đọc từ trình duyệt của từng người — không có gì để lập chỉ mục.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/bang-dieu-khien", "/on-tap", "/cai-dat"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
