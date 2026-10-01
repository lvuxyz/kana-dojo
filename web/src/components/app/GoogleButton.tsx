// CHẾ ĐỘ CÁ NHÂN (tạm thời) — xem docs/LOCAL_MODE.md.
// Nút đăng nhập Google — không dùng vì không có tài khoản (trang đăng nhập/đăng ký cũng đã tắt).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// ` (đánh dấu `[máy chủ — đang tắt]`).
// Bật lại: bỏ tiền tố `// ` và xoá dòng `export {};`.
// [máy chủ — đang tắt]

export {};

// "use client";
//
// import { Button } from "@/components/ui";
//
// export function GoogleButton({ label }: { label: string }) {
//   const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
//   if (!clientId) {
//     return (
//       <p className="rounded-lg border border-dashed border-rule px-3 py-2.5 text-center text-[12px] text-sumi-3">
//         Đăng nhập Google chưa được cấu hình — đặt <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> trong <code>.env</code>.
//       </p>
//     );
//   }
//   return (
//     <Button size="lg" onClick={() => { window.location.href = "/api/auth/google/start"; }}>
//       <svg viewBox="0 0 24 24" width="17" height="17"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14Z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1Z"/></svg>
//       {label}
//     </Button>
//   );
// }
