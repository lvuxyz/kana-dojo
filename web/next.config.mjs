/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lint chạy riêng bằng `npm run lint` (ESLint 9 CLI); không chạy lại trong `next build`.
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${process.env.BACKEND_URL ?? "http://localhost:8080"}/api/v1/:path*` }];
  },
};

export default nextConfig;
