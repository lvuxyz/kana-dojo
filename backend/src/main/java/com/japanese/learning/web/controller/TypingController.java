// ĐANG TẮT — đồng bộ luyện gõ lên máy chủ (lưu kỷ lục, cộng XP/streak theo tài khoản).
// Phòng luyện gõ hiện chạy hoàn toàn trên máy người dùng (localStorage), nên mã này được giữ lại dưới dạng
// comment. Cách bật lại: docs/TYPING.md, mục "Mã đồng bộ máy chủ (đang tắt)".
//
// package com.japanese.learning.web.controller;
//
// import com.japanese.learning.security.AppUserPrincipal;
// import com.japanese.learning.service.CurrentUserService;
// import com.japanese.learning.service.TypingService;
// import com.japanese.learning.web.dto.TypingDtos.TypingResultDto;
// import com.japanese.learning.web.dto.TypingDtos.TypingSessionRequest;
// import com.japanese.learning.web.dto.TypingDtos.TypingStatsDto;
// import io.swagger.v3.oas.annotations.Operation;
// import io.swagger.v3.oas.annotations.tags.Tag;
// import jakarta.validation.Valid;
// import lombok.RequiredArgsConstructor;
// import org.springframework.security.core.annotation.AuthenticationPrincipal;
// import org.springframework.web.bind.annotation.GetMapping;
// import org.springframework.web.bind.annotation.PostMapping;
// import org.springframework.web.bind.annotation.RequestBody;
// import org.springframework.web.bind.annotation.RequestMapping;
// import org.springframework.web.bind.annotation.RestController;
//
// @Tag(name = "Typing", description = "Luyện gõ tiếng Nhật theo câu mẫu")
// @RestController
// @RequestMapping("/api/v1/typing")
// @RequiredArgsConstructor
// public class TypingController {
//
//     private final TypingService typingService;
//     private final CurrentUserService currentUserService;
//
//     @Operation(summary = "Ghi nhận một lượt gõ (server tính lại điểm, cộng XP, so kỷ lục)")
//     @PostMapping("/sessions")
//     public TypingResultDto record(@AuthenticationPrincipal AppUserPrincipal principal,
//                                   @Valid @RequestBody TypingSessionRequest request) {
//         return typingService.record(currentUserService.require(principal), request);
//     }
//
//     @Operation(summary = "Kỷ lục theo từng tổ hợp và 10 lượt gần nhất")
//     @GetMapping("/stats")
//     public TypingStatsDto stats(@AuthenticationPrincipal AppUserPrincipal principal) {
//         return typingService.stats(currentUserService.require(principal));
//     }
// }
