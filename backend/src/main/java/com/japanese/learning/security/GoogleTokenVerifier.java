// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.security;
//
// import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
// import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
// import com.google.api.client.http.javanet.NetHttpTransport;
// import com.google.api.client.json.gson.GsonFactory;
// import com.japanese.learning.common.ApiException;
// import com.japanese.learning.config.AppProperties;
// import lombok.extern.slf4j.Slf4j;
// import org.springframework.stereotype.Component;
// import org.springframework.util.StringUtils;
//
// import java.io.IOException;
// import java.security.GeneralSecurityException;
// import java.util.Collections;
//
// /**
//  * Xác thực Google ID token. Bắt buộc kiểm tra hai điều kiện:
//  * <ul>
//  *   <li>{@code aud} khớp client id của ứng dụng — nếu bỏ qua, token cấp cho ứng dụng khác
//  *       cũng đăng nhập được vào đây;</li>
//  *   <li>{@code email_verified} — Google có thể cấp token cho email chưa xác minh.</li>
//  * </ul>
//  */
// @Slf4j
// @Component
// public class GoogleTokenVerifier {
//
//     /** Thông tin tối thiểu lấy được từ token đã xác thực. */
//     public record GoogleUser(String subject, String email, String name, String pictureUrl) {
//     }
//
//     private final GoogleIdTokenVerifier verifier;
//     private final boolean configured;
//
//     public GoogleTokenVerifier(AppProperties properties) {
//         String clientId = properties.google().clientId();
//         this.configured = StringUtils.hasText(clientId);
//         this.verifier = configured
//                 ? new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
//                         .setAudience(Collections.singletonList(clientId))
//                         .build()
//                 : null;
//     }
//
//     public GoogleUser verify(String idToken) {
//         if (!configured) {
//             throw ApiException.validation("Đăng nhập Google chưa được cấu hình trên máy chủ");
//         }
//         GoogleIdToken token;
//         try {
//             token = verifier.verify(idToken);
//         } catch (GeneralSecurityException | IOException ex) {
//             log.warn("Không xác thực được Google ID token: {}", ex.getMessage());
//             throw ApiException.unauthorized("Không xác thực được token Google");
//         }
//         if (token == null) {
//             throw ApiException.unauthorized("Token Google không hợp lệ hoặc đã hết hạn");
//         }
//
//         GoogleIdToken.Payload payload = token.getPayload();
//         if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
//             throw ApiException.unauthorized("Email của tài khoản Google chưa được xác minh");
//         }
//         String email = payload.getEmail();
//         if (!StringUtils.hasText(email)) {
//             throw ApiException.unauthorized("Token Google không chứa email");
//         }
//         return new GoogleUser(
//                 payload.getSubject(),
//                 email,
//                 asString(payload.get("name")),
//                 asString(payload.get("picture")));
//     }
//
//     private String asString(Object value) {
//         return value == null ? null : String.valueOf(value);
//     }
// }
