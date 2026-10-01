// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.web.dto;
//
// import jakarta.validation.Valid;
// import jakarta.validation.constraints.NotEmpty;
// import jakarta.validation.constraints.NotNull;
// import jakarta.validation.constraints.Size;
//
// import java.time.Instant;
// import java.util.List;
//
// public final class QuizDtos {
//
//     private QuizDtos() {
//     }
//
//     public record QuizDto(Long id,
//                           String title,
//                           String description,
//                           String quizType,
//                           Short jlptLevel,
//                           Integer timeLimitSec,
//                           long questionCount) {
//     }
//
//     /** Câu hỏi gửi cho client: không bao giờ kèm đáp án đúng. */
//     public record QuestionDto(Long id,
//                               String prompt,
//                               String questionType,
//                               List<String> options,
//                               int position) {
//     }
//
//     public record QuizDetailDto(Long id,
//                                 String title,
//                                 String description,
//                                 String quizType,
//                                 Short jlptLevel,
//                                 Integer timeLimitSec,
//                                 List<QuestionDto> questions) {
//     }
//
//     public record QuizAttemptDto(Long attemptId,
//                                  Long quizId,
//                                  Instant startedAt,
//                                  int totalCount) {
//     }
//
//     public record AnswerInput(
//             @NotNull(message = "Thiếu questionId")
//             Long questionId,
//
//             @Size(max = 512, message = "Câu trả lời quá dài")
//             String givenAnswer) {
//     }
//
//     public record SubmitQuizRequest(
//             @NotEmpty(message = "Danh sách câu trả lời không được rỗng")
//             @Valid
//             List<AnswerInput> answers) {
//     }
//
//     public record AnswerResultDto(Long questionId,
//                                   String givenAnswer,
//                                   boolean correct,
//                                   String correctAnswer,
//                                   String explanationVi) {
//     }
//
//     public record QuizResultDto(Long attemptId,
//                                 Long quizId,
//                                 int score,
//                                 int correctCount,
//                                 int totalCount,
//                                 int xpEarned,
//                                 List<AnswerResultDto> answers) {
//     }
// }
