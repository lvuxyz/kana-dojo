// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.web.controller;
//
// import com.japanese.learning.domain.entity.User;
// import com.japanese.learning.security.AppUserPrincipal;
// import com.japanese.learning.service.CurrentUserService;
// import com.japanese.learning.service.EntitlementService;
// import com.japanese.learning.service.GamificationService;
// import com.japanese.learning.web.dto.GamificationDtos.HeatmapEntryDto;
// import com.japanese.learning.web.dto.GamificationDtos.StatsDto;
// import io.swagger.v3.oas.annotations.Operation;
// import io.swagger.v3.oas.annotations.tags.Tag;
// import lombok.RequiredArgsConstructor;
// import org.springframework.security.core.annotation.AuthenticationPrincipal;
// import org.springframework.web.bind.annotation.GetMapping;
// import org.springframework.web.bind.annotation.RequestMapping;
// import org.springframework.web.bind.annotation.RequestParam;
// import org.springframework.web.bind.annotation.RestController;
//
// import java.util.List;
//
// @Tag(name = "Stats", description = "XP, cấp độ, streak và biểu đồ hoạt động")
// @RestController
// @RequestMapping("/api/v1/stats")
// @RequiredArgsConstructor
// public class StatsController {
//
//     private final GamificationService gamificationService;
//     private final EntitlementService entitlementService;
//     private final CurrentUserService currentUserService;
//
//     @Operation(summary = "Chỉ số của tài khoản đang đăng nhập")
//     @GetMapping("/me")
//     public StatsDto me(@AuthenticationPrincipal AppUserPrincipal principal) {
//         return gamificationService.statsDtoFor(currentUserService.require(principal));
//     }
//
//     @Operation(summary = "Biểu đồ hoạt động theo ngày; số ngày bị giới hạn theo gói cước")
//     @GetMapping("/heatmap")
//     public List<HeatmapEntryDto> heatmap(@AuthenticationPrincipal AppUserPrincipal principal,
//                                          @RequestParam(defaultValue = "365") int days) {
//         User user = currentUserService.require(principal);
//         int allowedDays = entitlementService.historyDays(user.getPlan());
//         return gamificationService.heatmap(user, Math.min(Math.max(days, 1), allowedDays));
//     }
// }
