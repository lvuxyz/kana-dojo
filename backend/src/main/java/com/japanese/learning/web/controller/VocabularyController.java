// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.web.controller;
//
// import com.japanese.learning.common.PageResponse;
// import com.japanese.learning.domain.enums.PlanCode;
// import com.japanese.learning.security.AppUserPrincipal;
// import com.japanese.learning.service.CurrentUserService;
// import com.japanese.learning.service.VocabularyService;
// import com.japanese.learning.web.dto.ContentDtos.VocabularyDto;
// import io.swagger.v3.oas.annotations.Operation;
// import io.swagger.v3.oas.annotations.tags.Tag;
// import lombok.RequiredArgsConstructor;
// import org.springframework.data.domain.Pageable;
// import org.springframework.data.web.PageableDefault;
// import org.springframework.security.core.annotation.AuthenticationPrincipal;
// import org.springframework.web.bind.annotation.GetMapping;
// import org.springframework.web.bind.annotation.RequestMapping;
// import org.springframework.web.bind.annotation.RequestParam;
// import org.springframework.web.bind.annotation.RestController;
//
// @Tag(name = "Vocabulary", description = "Tra cứu từ vựng")
// @RestController
// @RequestMapping("/api/v1/vocabulary")
// @RequiredArgsConstructor
// public class VocabularyController {
//
//     private final VocabularyService vocabularyService;
//     private final CurrentUserService currentUserService;
//
//     @Operation(summary = "Tìm kiếm từ vựng có phân trang")
//     @GetMapping
//     public PageResponse<VocabularyDto> search(@AuthenticationPrincipal AppUserPrincipal principal,
//                                               @RequestParam(required = false) Short level,
//                                               @RequestParam(required = false) String q,
//                                               @PageableDefault(size = 20) Pageable pageable) {
//         // Khách chưa đăng nhập được xem đúng phạm vi của gói miễn phí.
//         PlanCode plan = principal == null
//                 ? PlanCode.FREE
//                 : currentUserService.require(principal).getPlan();
//         return vocabularyService.search(plan, level, q, pageable);
//     }
// }
