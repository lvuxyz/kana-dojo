// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.config;
//
// import jakarta.annotation.PostConstruct;
// import lombok.RequiredArgsConstructor;
// import org.springframework.context.annotation.Profile;
// import org.springframework.stereotype.Component;
// import org.springframework.util.StringUtils;
//
// /**
//  * Ở profile prod, thiếu bí mật là lỗi khởi động chứ không phải cảnh báo.
//  * Chạy sớm hơn mọi request nên không có cửa sổ nào ứng dụng phục vụ với cấu hình rỗng.
//  */
// @Component
// @Profile("prod")
// @RequiredArgsConstructor
// public class ProdSecretsValidator {
//
//     private final AppProperties properties;
//
//     @PostConstruct
//     void validate() {
//         requireConfigured(properties.jwt().secret(), "app.jwt.secret (biến môi trường JWT_SECRET)");
//         if (properties.jwt().secret().getBytes(java.nio.charset.StandardCharsets.UTF_8).length < 32) {
//             throw new IllegalStateException(
//                     "app.jwt.secret phải dài tối thiểu 32 byte để ký HS256 an toàn");
//         }
//         if (properties.cors().allowedOrigins().isEmpty()) {
//             throw new IllegalStateException(
//                     "app.cors.allowed-origins (biến môi trường CORS_ORIGINS) không được để trống ở profile prod");
//         }
//         requireConfigured(properties.google().clientId(), "app.google.client-id (biến môi trường GOOGLE_CLIENT_ID)");
//     }
//
//     private void requireConfigured(String value, String name) {
//         if (!StringUtils.hasText(value)) {
//             throw new IllegalStateException("Thiếu cấu hình bắt buộc ở profile prod: " + name);
//         }
//     }
// }
