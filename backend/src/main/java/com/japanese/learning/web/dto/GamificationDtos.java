// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.web.dto;
//
// import com.japanese.learning.domain.enums.BadgeTier;
//
// import java.time.Instant;
// import java.time.LocalDate;
// import java.util.List;
//
// /** DTO của trò chơi hóa: chỉ số, heatmap, huy hiệu, bảng xếp hạng. */
// public final class GamificationDtos {
//
//     private GamificationDtos() {
//     }
//
//     public record StatsDto(long xpTotal,
//                            int level,
//                            long xpToNextLevel,
//                            int currentStreak,
//                            int longestStreak,
//                            int streakFreezes,
//                            int todayXp,
//                            int dailyGoalXp,
//                            boolean goalMet) {
//     }
//
//     public record HeatmapEntryDto(LocalDate date, int xp, int reviews) {
//     }
//
//     public record BadgeDto(Long id,
//                            String code,
//                            String nameVi,
//                            String descriptionVi,
//                            String icon,
//                            BadgeTier tier,
//                            int sortOrder,
//                            Instant earnedAt) {
//     }
//
//     public record LeaderboardEntryDto(int rank,
//                                       Long userId,
//                                       String displayName,
//                                       String avatarUrl,
//                                       long xp) {
//     }
//
//     public record LeaderboardDto(LocalDate weekStart,
//                                  Integer myRank,
//                                  List<LeaderboardEntryDto> entries) {
//     }
// }
