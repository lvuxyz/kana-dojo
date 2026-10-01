// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.web.controller;
//
// import com.japanese.learning.security.AppUserPrincipal;
// import com.japanese.learning.security.ClientIpResolver;
// import com.japanese.learning.service.AuthService;
// import com.japanese.learning.service.CurrentUserService;
// import com.japanese.learning.web.dto.AuthDtos.AuthResponse;
// import com.japanese.learning.web.dto.AuthDtos.GoogleAuthRequest;
// import com.japanese.learning.web.dto.AuthDtos.LoginRequest;
// import com.japanese.learning.web.dto.AuthDtos.RefreshRequest;
// import com.japanese.learning.web.dto.AuthDtos.RegisterRequest;
// import com.japanese.learning.web.dto.AuthDtos.UpdateProfileRequest;
// import com.japanese.learning.web.dto.AuthDtos.UserDto;
// import io.swagger.v3.oas.annotations.Operation;
// import io.swagger.v3.oas.annotations.tags.Tag;
// import jakarta.servlet.http.HttpServletRequest;
// import jakarta.validation.Valid;
// import lombok.RequiredArgsConstructor;
// import org.springframework.http.ResponseEntity;
// import org.springframework.security.core.annotation.AuthenticationPrincipal;
// import org.springframework.web.bind.annotation.GetMapping;
// import org.springframework.web.bind.annotation.PatchMapping;
// import org.springframework.web.bind.annotation.PostMapping;
// import org.springframework.web.bind.annotation.RequestBody;
// import org.springframework.web.bind.annotation.RequestMapping;
// import org.springframework.web.bind.annotation.RestController;
//
// @Tag(name = "Auth", description = "Đăng ký, đăng nhập, làm mới phiên và hồ sơ người dùng")
// @RestController
// @RequestMapping("/api/v1/auth")
// @RequiredArgsConstructor
// public class AuthController {
//
//     private final AuthService authService;
//     private final CurrentUserService currentUserService;
//
//     @Operation(summary = "Đăng ký tài khoản mới")
//     @PostMapping("/register")
//     public AuthResponse register(@Valid @RequestBody RegisterRequest request,
//                                  HttpServletRequest httpRequest) {
//         return authService.register(request, userAgent(httpRequest), ip(httpRequest));
//     }
//
//     @Operation(summary = "Đăng nhập bằng email hoặc tên đăng nhập")
//     @PostMapping("/login")
//     public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
//         return authService.login(request, userAgent(httpRequest), ip(httpRequest));
//     }
//
//     @Operation(summary = "Đăng nhập bằng Google ID token")
//     @PostMapping("/google")
//     public AuthResponse google(@Valid @RequestBody GoogleAuthRequest request, HttpServletRequest httpRequest) {
//         return authService.loginWithGoogle(request, userAgent(httpRequest), ip(httpRequest));
//     }
//
//     @Operation(summary = "Làm mới phiên; refresh token cũ bị thu hồi ngay khi dùng")
//     @PostMapping("/refresh")
//     public AuthResponse refresh(@Valid @RequestBody RefreshRequest request, HttpServletRequest httpRequest) {
//         return authService.refresh(request, userAgent(httpRequest), ip(httpRequest));
//     }
//
//     @Operation(summary = "Đăng xuất thiết bị hiện tại")
//     @PostMapping("/logout")
//     public ResponseEntity<Void> logout(@Valid @RequestBody RefreshRequest request) {
//         authService.logout(request.refreshToken());
//         return ResponseEntity.noContent().build();
//     }
//
//     @Operation(summary = "Thông tin tài khoản đang đăng nhập")
//     @GetMapping("/me")
//     public UserDto me(@AuthenticationPrincipal AppUserPrincipal principal) {
//         return AuthService.toDto(currentUserService.require(principal));
//     }
//
//     @Operation(summary = "Cập nhật hồ sơ")
//     @PatchMapping("/me")
//     public UserDto updateMe(@AuthenticationPrincipal AppUserPrincipal principal,
//                             @Valid @RequestBody UpdateProfileRequest request) {
//         // userId lấy từ SecurityContext, không nhận từ body.
//         return authService.updateProfile(currentUserService.require(principal).getId(), request);
//     }
//
//     private String userAgent(HttpServletRequest request) {
//         return request.getHeader("User-Agent");
//     }
//
//     private String ip(HttpServletRequest request) {
//         return ClientIpResolver.resolve(request);
//     }
// }
