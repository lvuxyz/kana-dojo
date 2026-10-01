// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.domain.entity;
//
// import jakarta.persistence.Column;
// import jakarta.persistence.Entity;
// import jakarta.persistence.Table;
// import lombok.AllArgsConstructor;
// import lombok.Builder;
// import lombok.Getter;
// import lombok.NoArgsConstructor;
// import lombok.Setter;
//
// import java.time.LocalDate;
//
// @Entity
// @Table(name = "user_stats")
// @Getter
// @Setter
// @NoArgsConstructor
// @AllArgsConstructor
// @Builder
// public class UserStats extends BaseEntity {
//
//     @Column(name = "user_id", nullable = false, unique = true)
//     private Long userId;
//
//     @Column(name = "xp_total", nullable = false)
//     @Builder.Default
//     private long xpTotal = 0L;
//
//     @Column(name = "level", nullable = false)
//     @Builder.Default
//     private int level = 1;
//
//     @Column(name = "current_streak", nullable = false)
//     @Builder.Default
//     private int currentStreak = 0;
//
//     @Column(name = "longest_streak", nullable = false)
//     @Builder.Default
//     private int longestStreak = 0;
//
//     /** Ngày địa phương gần nhất người học đạt mục tiêu XP, không phải ngày mở app. */
//     @Column(name = "last_active_date")
//     private LocalDate lastActiveDate;
//
//     @Column(name = "streak_freezes", nullable = false)
//     @Builder.Default
//     private short streakFreezes = 2;
//
//     @Column(name = "total_reviews", nullable = false)
//     @Builder.Default
//     private long totalReviews = 0L;
//
//     @Column(name = "total_writing_ms", nullable = false)
//     @Builder.Default
//     private long totalWritingMs = 0L;
// }
