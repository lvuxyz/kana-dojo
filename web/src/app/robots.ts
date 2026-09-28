import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
  return {
    // Khu vực đăng nhập không có nội dung công khai, để Google bò vào chỉ tốn ngân sách thu thập
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/bang-dieu-khien", "/on-tap", "/luyen-viet", "/tu-vung", "/quiz", "/bang-xep-hang", "/ho-so"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
