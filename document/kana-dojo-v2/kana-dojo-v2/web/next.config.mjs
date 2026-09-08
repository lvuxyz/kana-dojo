/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${process.env.BACKEND_URL ?? "http://localhost:8080"}/api/v1/:path*` }];
  },
};
