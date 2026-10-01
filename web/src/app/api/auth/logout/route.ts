// CHẾ ĐỘ CÁ NHÂN (tạm thời) — xem docs/LOCAL_MODE.md.
// BFF /api/auth/*: chuyển tiếp tới backend và đặt cookie refresh token — không dùng khi không có backend.
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// ` (đánh dấu `[máy chủ — đang tắt]`).
// Bật lại: bỏ tiền tố `// ` và xoá dòng `export {};`.
// [máy chủ — đang tắt]

export {};

// import { cookies } from "next/headers";
// import { NextResponse } from "next/server";
// import { RT_COOKIE } from "@/lib/auth-proxy";
//
// const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8080";
//
// export async function POST() {
//   const jar = await cookies();
//   const token = jar.get(RT_COOKIE)?.value;
//
//   // Thu hồi phía máy chủ, nhưng dù thất bại vẫn phải xoá cookie ở client.
//   if (token) {
//     await fetch(`${BACKEND}/api/v1/auth/logout`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ refreshToken: token }),
//     }).catch(() => {});
//   }
//
//   const res = NextResponse.json({ ok: true });
//   res.cookies.set(RT_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
//   return res;
// }
