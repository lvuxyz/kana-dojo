/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Xuất bản tĩnh: `next build` ghi toàn bộ site vào out/ — HTML, JS, CSS thuần, không cần Node ở máy chủ.
  // Không có backend, API hay cơ sở dữ liệu; tiến độ học nằm trong localStorage của từng người dùng.
  // Có thể đặt out/ lên bất kỳ máy chủ tĩnh nào (Nginx, GitHub Pages, Netlify, Vercel, Cloudflare Pages, S3…).
  output: "export",
  // Lint chạy riêng bằng `npm run lint` (ESLint 9 CLI); không chạy lại trong `next build`.
  eslint: { ignoreDuringBuilds: true },
  // Cho phép mở bản dev từ điện thoại trong mạng LAN (dải IP riêng). Next so khớp từ phải sang và mỗi `*` chỉ thay
  // MỘT đoạn, nên phải viết đủ 4 đoạn — "192.168.*" không khớp 192.168.1.5. Đã khai báo mục này thì Next CHẶN (403)
  // mọi origin khác thay vì chỉ cảnh báo, kể cả websocket HMR. Kiểm thử: next.config.test.mjs.
  allowedDevOrigins: [
    "192.168.*.*",
    "10.*.*.*",
    ...Array.from({ length: 16 }, (_, i) => `172.${16 + i}.*.*`),
  ],
};

export default nextConfig;
