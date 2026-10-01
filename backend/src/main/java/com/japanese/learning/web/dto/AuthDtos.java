// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.web.dto;
//
// import com.japanese.learning.domain.enums.PlanCode;
// import com.japanese.learning.domain.enums.Role;
// import jakarta.validation.constraints.Email;
// import jakarta.validation.constraints.Max;
// import jakarta.validation.constraints.Min;
// import jakarta.validation.constraints.NotBlank;
// import jakarta.validation.constraints.Pattern;
// import jakarta.validation.constraints.Size;
//
// import java.time.Instant;
//
// /** Các DTO của nhóm xác thực. Gom một file để hợp đồng auth đọc được trong một màn hình. */
// public final class AuthDtos {
//
//     private AuthDtos() {
//     }
//
//     public record RegisterRequest(
//             @NotBlank(message = "Email không được để trống")
//             @Email(message = "Email không đúng định dạng")
//             @Size(max = 190, message = "Email quá dài")
//             String email,
//
//             @NotBlank(message = "Tên đăng nhập không được để trống")
//             @Size(min = 3, max = 32, message = "Tên đăng nhập phải từ 3 đến 32 ký tự")
//             @Pattern(regexp = "^[a-zA-Z0-9._-]+$",
//                     message = "Tên đăng nhập chỉ được chứa chữ, số và các ký tự . _ -")
//             String username,
//
//             @NotBlank(message = "Mật khẩu không được để trống")
//             @Size(min = 8, max = 72, message = "Mật khẩu phải có ít nhất 8 ký tự")
//             String password,
//
//             @NotBlank(message = "Tên hiển thị không được để trống")
//             @Size(max = 64, message = "Tên hiển thị tối đa 64 ký tự")
//             String displayName,
//
//             @Size(max = 64, message = "Múi giờ không hợp lệ")
//             String timezone) {
//     }
//
//     public record LoginRequest(
//             @NotBlank(message = "Email hoặc tên đăng nhập không được để trống")
//             String emailOrUsername,
//
//             @NotBlank(message = "Mật khẩu không được để trống")
//             String password) {
//     }
//
//     public record GoogleAuthRequest(
//             @NotBlank(message = "Thiếu idToken của Google")
//             String idToken) {
//     }
//
//     public record RefreshRequest(
//             @NotBlank(message = "Thiếu refresh token")
//             String refreshToken) {
//     }
//
//     public record UpdateProfileRequest(
//             @Size(max = 64, message = "Tên hiển thị tối đa 64 ký tự")
//             String displayName,
//
//             @Size(max = 64, message = "Múi giờ không hợp lệ")
//             String timezone,
//
//             @Min(value = 10, message = "Mục tiêu ngày tối thiểu là 10 XP")
//             @Max(value = 5000, message = "Mục tiêu ngày tối đa là 5000 XP")
//             Integer dailyGoalXp,
//
//             @Size(max = 8, message = "Mã ngôn ngữ không hợp lệ")
//             String locale) {
//     }
//
//     public record UserDto(Long id,
//                           String email,
//                           String username,
//                           String displayName,
//                           String avatarUrl,
//                           Role role,
//                           PlanCode plan,
//                           String timezone,
//                           String locale,
//                           Integer dailyGoalXp,
//                           Instant createdAt) {
//     }
//
//     public record AuthResponse(String accessToken,
//                                String refreshToken,
//                                long expiresIn,
//                                UserDto user) {
//     }
// }
