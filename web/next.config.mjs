/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Xuất bản tĩnh: `next build` ghi toàn bộ site vào out/ — HTML, JS, CSS thuần, không cần Node ở máy chủ.
  // Không có backend, API hay cơ sở dữ liệu; tiến độ học nằm trong localStorage của từng người dùng.
  // Có thể đặt out/ lên bất kỳ máy chủ tĩnh nào (Nginx, GitHub Pages, Netlify, Vercel, Cloudflare Pages, S3…).
  output: "export",
  // Lint chạy riêng bằng `npm run lint` (ESLint 9 CLI); không chạy lại trong `next build`.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
