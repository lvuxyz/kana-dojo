// CHẾ ĐỘ CÁ NHÂN (tạm thời) — xem docs/LOCAL_MODE.md.
// BFF /api/auth/*: chuyển tiếp tới backend và đặt cookie refresh token — không dùng khi không có backend.
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// ` (đánh dấu `[máy chủ — đang tắt]`).
// Bật lại: bỏ tiền tố `// ` và xoá dòng `export {};`.
// [máy chủ — đang tắt]

export {};

// import { forwardAuth } from "@/lib/auth-proxy";
//
// export async function POST(req: Request) {
//   return forwardAuth("google", await req.json());
// }
