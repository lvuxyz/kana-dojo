// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.security;
//
// import java.nio.charset.StandardCharsets;
// import java.security.MessageDigest;
// import java.security.NoSuchAlgorithmException;
// import java.security.SecureRandom;
// import java.util.Base64;
// import java.util.HexFormat;
//
// /** Sinh và băm refresh token. Tách riêng để logic mật mã không lẫn vào tầng nghiệp vụ. */
// public final class TokenHasher {
//
//     private static final SecureRandom RANDOM = new SecureRandom();
//     private static final int TOKEN_BYTES = 32;
//
//     private TokenHasher() {
//     }
//
//     /** Chuỗi ngẫu nhiên 256 bit, mã hoá base64url không đệm. */
//     public static String randomToken() {
//         byte[] buffer = new byte[TOKEN_BYTES];
//         RANDOM.nextBytes(buffer);
//         return Base64.getUrlEncoder().withoutPadding().encodeToString(buffer);
//     }
//
//     /** SHA-256 dạng hex thường, đúng 64 ký tự để khớp cột char(64). */
//     public static String sha256Hex(String raw) {
//         try {
//             MessageDigest digest = MessageDigest.getInstance("SHA-256");
//             byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
//             return HexFormat.of().formatHex(hash);
//         } catch (NoSuchAlgorithmException ex) {
//             throw new IllegalStateException("JVM không hỗ trợ SHA-256", ex);
//         }
//     }
// }
