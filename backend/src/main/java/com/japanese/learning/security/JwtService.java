// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.security;
//
// import com.japanese.learning.config.AppProperties;
// import com.japanese.learning.domain.entity.User;
// import io.jsonwebtoken.Claims;
// import io.jsonwebtoken.JwtException;
// import io.jsonwebtoken.Jwts;
// import io.jsonwebtoken.security.Keys;
// import org.springframework.stereotype.Service;
//
// import javax.crypto.SecretKey;
// import java.nio.charset.StandardCharsets;
// import java.time.Duration;
// import java.time.Instant;
// import java.util.Date;
//
// /** Phát và kiểm tra access token HS256. Access token sống ngắn (15 phút) và không thu hồi được. */
// @Service
// public class JwtService {
//
//     private static final String CLAIM_ROLE = "role";
//     private static final String CLAIM_USERNAME = "username";
//     private static final String CLAIM_EMAIL = "email";
//
//     private final SecretKey signingKey;
//     private final String issuer;
//     private final Duration accessTokenTtl;
//
//     public JwtService(AppProperties properties) {
//         String secret = properties.jwt().secret();
//         if (secret == null || secret.isBlank()) {
//             throw new IllegalStateException("Thiếu app.jwt.secret: hãy đặt biến môi trường JWT_SECRET");
//         }
//         byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
//         if (keyBytes.length < 32) {
//             throw new IllegalStateException("app.jwt.secret phải dài tối thiểu 32 byte để ký HS256 an toàn");
//         }
//         this.signingKey = Keys.hmacShaKeyFor(keyBytes);
//         this.issuer = properties.jwt().issuer();
//         this.accessTokenTtl = properties.jwt().accessTokenTtl();
//     }
//
//     public String generateAccessToken(User user) {
//         Instant now = Instant.now();
//         return Jwts.builder()
//                 .issuer(issuer)
//                 .subject(String.valueOf(user.getId()))
//                 .claim(CLAIM_ROLE, user.getRole().name())
//                 .claim(CLAIM_USERNAME, user.getUsername())
//                 .claim(CLAIM_EMAIL, user.getEmail())
//                 .issuedAt(Date.from(now))
//                 .expiration(Date.from(now.plus(accessTokenTtl)))
//                 .signWith(signingKey, Jwts.SIG.HS256)
//                 .compact();
//     }
//
//     /** Trả về claims nếu chữ ký, issuer và hạn dùng đều hợp lệ; ngược lại ném JwtException. */
//     public Claims parseClaims(String token) throws JwtException {
//         return Jwts.parser()
//                 .verifyWith(signingKey)
//                 .requireIssuer(issuer)
//                 .build()
//                 .parseSignedClaims(token)
//                 .getPayload();
//     }
//
//     public long accessTokenTtlSeconds() {
//         return accessTokenTtl.toSeconds();
//     }
//
//     public static String roleClaim() {
//         return CLAIM_ROLE;
//     }
//
//     public static String usernameClaim() {
//         return CLAIM_USERNAME;
//     }
//
//     public static String emailClaim() {
//         return CLAIM_EMAIL;
//     }
// }
