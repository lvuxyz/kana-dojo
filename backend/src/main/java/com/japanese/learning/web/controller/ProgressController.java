// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.web.controller;
//
// import com.japanese.learning.domain.enums.Script;
// import com.japanese.learning.security.AppUserPrincipal;
// import com.japanese.learning.service.CurrentUserService;
// import com.japanese.learning.service.ProgressService;
// import com.japanese.learning.web.dto.LearningDtos.KanaProgressDto;
// import com.japanese.learning.web.dto.LearningDtos.ProgressSummaryDto;
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
// @Tag(name = "Progress", description = "Tiến độ học của người dùng")
// @RestController
// @RequestMapping("/api/v1/progress")
// @RequiredArgsConstructor
// public class ProgressController {
//
//     private final ProgressService progressService;
//     private final CurrentUserService currentUserService;
//
//     @Operation(summary = "Tiến độ từng ký tự cho lưới bảng chữ")
//     @GetMapping("/kana")
//     public List<KanaProgressDto> kana(@AuthenticationPrincipal AppUserPrincipal principal,
//                                       @RequestParam(required = false) Script script) {
//         return progressService.kanaProgress(currentUserService.require(principal), script);
//     }
//
//     @Operation(summary = "Số liệu tổng hợp cho màn hình chính")
//     @GetMapping("/summary")
//     public ProgressSummaryDto summary(@AuthenticationPrincipal AppUserPrincipal principal) {
//         return progressService.summary(currentUserService.require(principal));
//     }
// }
