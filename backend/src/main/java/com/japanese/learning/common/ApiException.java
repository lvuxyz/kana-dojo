// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.common;
//
// import lombok.Getter;
// import org.springframework.http.HttpStatus;
//
// import java.net.URI;
// import java.util.Map;
//
// /** Lỗi nghiệp vụ đã biết trước, mang sẵn đủ thông tin để dựng Problem Details. */
// @Getter
// public class ApiException extends RuntimeException {
//
//     private final HttpStatus status;
//     private final URI type;
//     private final String title;
//     private final Map<String, String> errors;
//
//     public ApiException(HttpStatus status, URI type, String title, String detail) {
//         this(status, type, title, detail, Map.of());
//     }
//
//     public ApiException(HttpStatus status, URI type, String title, String detail, Map<String, String> errors) {
//         super(detail);
//         this.status = status;
//         this.type = type;
//         this.title = title;
//         this.errors = errors == null ? Map.of() : Map.copyOf(errors);
//     }
//
//     public static ApiException notFound(String detail) {
//         return new ApiException(HttpStatus.NOT_FOUND, ErrorTypes.NOT_FOUND, "Không tìm thấy", detail);
//     }
//
//     public static ApiException validation(String detail) {
//         return new ApiException(HttpStatus.BAD_REQUEST, ErrorTypes.VALIDATION, "Dữ liệu không hợp lệ", detail);
//     }
//
//     public static ApiException validation(String detail, Map<String, String> errors) {
//         return new ApiException(HttpStatus.BAD_REQUEST, ErrorTypes.VALIDATION, "Dữ liệu không hợp lệ", detail, errors);
//     }
//
//     public static ApiException conflict(String detail, Map<String, String> errors) {
//         return new ApiException(HttpStatus.CONFLICT, ErrorTypes.CONFLICT, "Xung đột dữ liệu", detail, errors);
//     }
//
//     public static ApiException unauthorized(String detail) {
//         return new ApiException(HttpStatus.UNAUTHORIZED, ErrorTypes.UNAUTHORIZED, "Chưa xác thực", detail);
//     }
//
//     public static ApiException forbidden(String detail) {
//         return new ApiException(HttpStatus.FORBIDDEN, ErrorTypes.FORBIDDEN, "Không có quyền truy cập", detail);
//     }
// }
