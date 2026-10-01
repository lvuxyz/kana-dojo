/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Gói server tối giản vào .next/standalone cho image Docker (chạy bằng `node server.js`).
  output: "standalone",
  // Lint chạy riêng bằng `npm run lint` (ESLint 9 CLI); không chạy lại trong `next build`.
  eslint: { ignoreDuringBuilds: true },
  // CHẾ ĐỘ CÁ NHÂN (tạm thời) — xem docs/LOCAL_MODE.md: web không gọi backend nên không có rewrite.
  // [máy chủ — đang tắt] Đích rewrite được chốt LÚC BUILD (ghi vào routes-manifest), nên BACKEND_URL phải có sẵn khi build —
  // [máy chủ — đang tắt] Dockerfile nhận nó qua build-arg. Route handler /api/auth/* thì đọc BACKEND_URL lúc chạy.
  // [máy chủ — đang tắt] async rewrites() {
  // [máy chủ — đang tắt]   return [{ source: "/api/v1/:path*", destination: `${process.env.BACKEND_URL ?? "http://localhost:8080"}/api/v1/:path*` }];
  // [máy chủ — đang tắt] },
};

export default nextConfig;
