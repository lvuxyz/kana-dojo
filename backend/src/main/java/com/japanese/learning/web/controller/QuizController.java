// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.web.controller;
//
// import com.japanese.learning.common.PageResponse;
// import com.japanese.learning.security.AppUserPrincipal;
// import com.japanese.learning.service.CurrentUserService;
// import com.japanese.learning.service.QuizService;
// import com.japanese.learning.web.dto.QuizDtos.QuizAttemptDto;
// import com.japanese.learning.web.dto.QuizDtos.QuizDetailDto;
// import com.japanese.learning.web.dto.QuizDtos.QuizDto;
// import com.japanese.learning.web.dto.QuizDtos.QuizResultDto;
// import com.japanese.learning.web.dto.QuizDtos.SubmitQuizRequest;
// import io.swagger.v3.oas.annotations.Operation;
// import io.swagger.v3.oas.annotations.tags.Tag;
// import jakarta.validation.Valid;
// import lombok.RequiredArgsConstructor;
// import org.springframework.data.domain.Pageable;
// import org.springframework.data.web.PageableDefault;
// import org.springframework.security.core.annotation.AuthenticationPrincipal;
// import org.springframework.web.bind.annotation.GetMapping;
// import org.springframework.web.bind.annotation.PathVariable;
// import org.springframework.web.bind.annotation.PostMapping;
// import org.springframework.web.bind.annotation.RequestBody;
// import org.springframework.web.bind.annotation.RequestMapping;
// import org.springframework.web.bind.annotation.RestController;
//
// @Tag(name = "Quizzes", description = "Bài kiểm tra")
// @RestController
// @RequestMapping("/api/v1")
// @RequiredArgsConstructor
// public class QuizController {
//
//     private final QuizService quizService;
//     private final CurrentUserService currentUserService;
//
//     @Operation(summary = "Danh sách bài kiểm tra đã xuất bản")
//     @GetMapping("/quizzes")
//     public PageResponse<QuizDto> list(@PageableDefault(size = 20) Pageable pageable) {
//         return quizService.listPublished(pageable);
//     }
//
//     @Operation(summary = "Chi tiết đề bài (không kèm đáp án)")
//     @GetMapping("/quizzes/{id}")
//     public QuizDetailDto detail(@PathVariable Long id) {
//         return quizService.detail(id);
//     }
//
//     @Operation(summary = "Bắt đầu một lượt làm bài")
//     @PostMapping("/quizzes/{id}/attempts")
//     public QuizAttemptDto start(@AuthenticationPrincipal AppUserPrincipal principal,
//                                 @PathVariable Long id) {
//         return quizService.startAttempt(currentUserService.require(principal), id);
//     }
//
//     @Operation(summary = "Nộp bài và nhận kết quả chấm")
//     @PostMapping("/quiz-attempts/{id}/submit")
//     public QuizResultDto submit(@AuthenticationPrincipal AppUserPrincipal principal,
//                                 @PathVariable Long id,
//                                 @Valid @RequestBody SubmitQuizRequest request) {
//         return quizService.submit(currentUserService.require(principal), id, request);
//     }
// }
