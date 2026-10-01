// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.web.controller;
//
// import com.japanese.learning.security.AppUserPrincipal;
// import com.japanese.learning.service.CurrentUserService;
// import com.japanese.learning.service.LeaderboardService;
// import com.japanese.learning.web.dto.GamificationDtos.LeaderboardDto;
// import io.swagger.v3.oas.annotations.Operation;
// import io.swagger.v3.oas.annotations.tags.Tag;
// import lombok.RequiredArgsConstructor;
// import org.springframework.format.annotation.DateTimeFormat;
// import org.springframework.security.core.annotation.AuthenticationPrincipal;
// import org.springframework.web.bind.annotation.GetMapping;
// import org.springframework.web.bind.annotation.RequestMapping;
// import org.springframework.web.bind.annotation.RequestParam;
// import org.springframework.web.bind.annotation.RestController;
//
// import java.time.LocalDate;
//
// @Tag(name = "Leaderboard", description = "Bảng xếp hạng tuần, tuần bắt đầu thứ Hai giờ Việt Nam")
// @RestController
// @RequestMapping("/api/v1/leaderboard")
// @RequiredArgsConstructor
// public class LeaderboardController {
//
//     private final LeaderboardService leaderboardService;
//     private final CurrentUserService currentUserService;
//
//     @Operation(summary = "Bảng xếp hạng tuần hiện tại")
//     @GetMapping("/weekly")
//     public LeaderboardDto weekly(@AuthenticationPrincipal AppUserPrincipal principal,
//                                  @RequestParam(defaultValue = "50") int limit) {
//         return leaderboardService.weekly(currentUserService.require(principal).getId(), limit);
//     }
//
//     @Operation(summary = "Bảng xếp hạng đã chốt của một tuần trong quá khứ")
//     @GetMapping("/archive")
//     public LeaderboardDto archive(@AuthenticationPrincipal AppUserPrincipal principal,
//                                   @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
//         return leaderboardService.archived(weekStart, currentUserService.require(principal).getId());
//     }
// }
