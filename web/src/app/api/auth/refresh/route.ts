// CHẾ ĐỘ CÁ NHÂN (tạm thời) — xem docs/LOCAL_MODE.md.
// BFF /api/auth/*: chuyển tiếp tới backend và đặt cookie refresh token — không dùng khi không có backend.
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// ` (đánh dấu `[máy chủ — đang tắt]`).
// Bật lại: bỏ tiền tố `// ` và xoá dòng `export {};`.
// [máy chủ — đang tắt]

export {};

// import { cookies } from "next/headers";
// import { NextResponse } from "next/server";
// import { forwardAuth, RT_COOKIE } from "@/lib/auth-proxy";
//
// export async function POST() {
//   const token = (await cookies()).get(RT_COOKIE)?.value;
//   if (!token) {
//     return NextResponse.json(
//       { type: "about:blank", title: "Chưa đăng nhập", status: 401, detail: "Phiên đã hết hạn." },
//       { status: 401 },
//     );
//   }
//   return forwardAuth("refresh", { refreshToken: token });
// }
