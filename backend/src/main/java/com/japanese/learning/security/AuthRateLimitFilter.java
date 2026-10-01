// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.security;
//
// import com.fasterxml.jackson.databind.ObjectMapper;
// import com.japanese.learning.common.ErrorTypes;
// import com.japanese.learning.config.AppProperties;
// import io.github.bucket4j.Bandwidth;
// import io.github.bucket4j.Bucket;
// import jakarta.servlet.FilterChain;
// import jakarta.servlet.ServletException;
// import jakarta.servlet.http.HttpServletRequest;
// import jakarta.servlet.http.HttpServletResponse;
// import lombok.extern.slf4j.Slf4j;
// import org.springframework.http.HttpMethod;
// import org.springframework.http.HttpStatus;
// import org.springframework.http.MediaType;
// import org.springframework.http.ProblemDetail;
// import org.springframework.lang.NonNull;
// import org.springframework.stereotype.Component;
// import org.springframework.web.filter.OncePerRequestFilter;
//
// import java.io.IOException;
// import java.net.URI;
// import java.nio.charset.StandardCharsets;
// import java.time.Duration;
// import java.util.Map;
// import java.util.Set;
// import java.util.concurrent.ConcurrentHashMap;
//
// /**
//  * Giới hạn 10 request/phút/IP cho hai endpoint dễ bị dò mật khẩu nhất.
//  *
//  * <p>Bucket4j in-memory là đủ cho v1 (một tiến trình). Khi chạy nhiều bản sao,
//  * đổi sang backend phân tán mà không phải sửa chỗ gọi.
//  */
// @Slf4j
// @Component
// public class AuthRateLimitFilter extends OncePerRequestFilter {
//
//     private static final Set<String> PROTECTED_PATHS = Set.of(
//             "/api/v1/auth/login",
//             "/api/v1/auth/register");
//
//     /** Giới hạn số IP theo dõi cùng lúc để bộ nhớ không phình vô hạn khi bị quét. */
//     private static final int MAX_TRACKED_CLIENTS = 100_000;
//
//     private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
//     private final ObjectMapper objectMapper;
//     private final int requestsPerMinute;
//
//     public AuthRateLimitFilter(ObjectMapper objectMapper, AppProperties properties) {
//         this.objectMapper = objectMapper;
//         this.requestsPerMinute = properties.rateLimit().authRequestsPerMinute();
//     }
//
//     @Override
//     protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
//         return !HttpMethod.POST.matches(request.getMethod())
//                 || !PROTECTED_PATHS.contains(request.getRequestURI());
//     }
//
//     @Override
//     protected void doFilterInternal(@NonNull HttpServletRequest request,
//                                     @NonNull HttpServletResponse response,
//                                     @NonNull FilterChain filterChain) throws ServletException, IOException {
//         String key = request.getRequestURI() + "|" + ClientIpResolver.resolve(request);
//         if (buckets.size() > MAX_TRACKED_CLIENTS) {
//             buckets.clear();
//         }
//         Bucket bucket = buckets.computeIfAbsent(key, ignored -> newBucket());
//
//         if (bucket.tryConsume(1)) {
//             filterChain.doFilter(request, response);
//             return;
//         }
//
//         log.info("Chặn vì vượt tần suất: {}", key);
//         writeTooManyRequests(request, response);
//     }
//
//     private Bucket newBucket() {
//         Bandwidth limit = Bandwidth.builder()
//                 .capacity(requestsPerMinute)
//                 .refillGreedy(requestsPerMinute, Duration.ofMinutes(1))
//                 .build();
//         return Bucket.builder().addLimit(limit).build();
//     }
//
//     private void writeTooManyRequests(HttpServletRequest request, HttpServletResponse response) throws IOException {
//         ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS,
//                 "Bạn đã thử quá nhiều lần. Vui lòng đợi một phút rồi thử lại.");
//         problem.setType(ErrorTypes.RATE_LIMITED);
//         problem.setTitle("Vượt giới hạn tần suất");
//         problem.setInstance(URI.create(request.getRequestURI()));
//
//         response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
//         response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
//         response.setCharacterEncoding(StandardCharsets.UTF_8.name());
//         response.setHeader("Retry-After", "60");
//         objectMapper.writeValue(response.getOutputStream(), problem);
//     }
// }
