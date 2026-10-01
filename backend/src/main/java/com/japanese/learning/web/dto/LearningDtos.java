// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.web.dto;
//
// import com.japanese.learning.domain.StrokeError;
// import com.japanese.learning.domain.enums.CardState;
// import com.japanese.learning.domain.enums.ItemType;
// import com.japanese.learning.domain.enums.WritingMode;
// import jakarta.validation.Valid;
// import jakarta.validation.constraints.Max;
// import jakarta.validation.constraints.Min;
// import jakarta.validation.constraints.NotNull;
// import jakarta.validation.constraints.PositiveOrZero;
// import jakarta.validation.constraints.Size;
//
// import java.time.Instant;
// import java.util.List;
//
// /** DTO của tầng học tập: hàng đợi ôn, chấm thẻ, luyện viết, tiến độ. */
// public final class LearningDtos {
//
//     private LearningDtos() {
//     }
//
//     public record ReviewQueueItemDto(Long cardId,
//                                      ItemType itemType,
//                                      Long itemId,
//                                      CardState state,
//                                      Instant dueAt,
//                                      int reps,
//                                      int lapses,
//                                      String character,
//                                      String romaji,
//                                      String readingVi,
//                                      String word,
//                                      String reading,
//                                      String meaningVi) {
//     }
//
//     public record ReviewQueueDto(List<ReviewQueueItemDto> content,
//                                  int dueCount,
//                                  int newCount) {
//     }
//
//     public record GradeRequest(
//             @NotNull(message = "Thiếu cardId")
//             Long cardId,
//
//             @NotNull(message = "Thiếu grade")
//             @Min(value = 1, message = "grade phải từ 1 đến 4")
//             @Max(value = 4, message = "grade phải từ 1 đến 4")
//             Integer grade,
//
//             @Min(value = 0, message = "Điểm phải từ 0 đến 100")
//             @Max(value = 100, message = "Điểm phải từ 0 đến 100")
//             Integer score,
//
//             @PositiveOrZero(message = "durationMs không được âm")
//             Integer durationMs) {
//     }
//
//     public record GradeResultDto(Long cardId,
//                                  Instant nextDueAt,
//                                  int intervalDays,
//                                  double stability,
//                                  double difficulty,
//                                  CardState state,
//                                  int xpEarned) {
//     }
//
//     public record WritingAttemptRequest(
//             @NotNull(message = "Thiếu kanaCharacterId")
//             Long kanaCharacterId,
//
//             @NotNull(message = "Thiếu chế độ luyện viết")
//             WritingMode mode,
//
//             @NotNull(message = "Thiếu điểm từng nét")
//             @Size(min = 1, max = 64, message = "Số nét phải từ 1 đến 64")
//             List<@Min(value = 0, message = "Điểm nét phải từ 0 đến 100")
//                     @Max(value = 100, message = "Điểm nét phải từ 0 đến 100") Integer> strokeScores,
//
//             @Valid
//             List<StrokeError> strokeErrors,
//
//             @NotNull(message = "Thiếu điểm trung bình")
//             @Min(value = 0, message = "Điểm trung bình phải từ 0 đến 100")
//             @Max(value = 100, message = "Điểm trung bình phải từ 0 đến 100")
//             Integer avgScore,
//
//             @PositiveOrZero(message = "durationMs không được âm")
//             Integer durationMs) {
//     }
//
//     public record WritingResultDto(boolean passed,
//                                    int avgScore,
//                                    int grade,
//                                    int xpEarned,
//                                    GradeResultDto card,
//                                    List<String> newBadges) {
//     }
//
//     /** Một ô trong lưới tiến độ bảng chữ. */
//     public record KanaProgressDto(Long characterId,
//                                   String character,
//                                   CardState state,
//                                   Instant dueAt,
//                                   Integer bestScore,
//                                   int level) {
//     }
//
//     public record ProgressSummaryDto(long kanaLearned,
//                                      long kanaMastered,
//                                      long vocabLearned,
//                                      long dueToday,
//                                      long newAvailable) {
//     }
// }
