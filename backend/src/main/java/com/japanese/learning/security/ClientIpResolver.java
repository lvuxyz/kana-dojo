// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.security;
//
// import jakarta.servlet.http.HttpServletRequest;
//
// /** Địa chỉ IP thật của client khi ứng dụng đứng sau reverse proxy. */
// public final class ClientIpResolver {
//
//     private ClientIpResolver() {
//     }
//
//     public static String resolve(HttpServletRequest request) {
//         String forwarded = request.getHeader("X-Forwarded-For");
//         if (forwarded != null && !forwarded.isBlank()) {
//             // Phần tử đầu tiên là client gốc, các phần sau là chuỗi proxy.
//             return forwarded.split(",")[0].trim();
//         }
//         String realIp = request.getHeader("X-Real-IP");
//         if (realIp != null && !realIp.isBlank()) {
//             return realIp.trim();
//         }
//         return request.getRemoteAddr();
//     }
// }
