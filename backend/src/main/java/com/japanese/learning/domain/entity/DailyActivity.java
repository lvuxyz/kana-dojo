// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.domain.entity;
//
// import jakarta.persistence.Column;
// import jakarta.persistence.Entity;
// import jakarta.persistence.Table;
// import jakarta.persistence.UniqueConstraint;
// import lombok.AllArgsConstructor;
// import lombok.Builder;
// import lombok.Getter;
// import lombok.NoArgsConstructor;
// import lombok.Setter;
//
// import java.time.LocalDate;
//
// /** Tổng hợp hoạt động theo ngày địa phương của người học; nguồn của heatmap và bảng xếp hạng. */
// @Entity
// @Table(name = "daily_activity",
//         uniqueConstraints = @UniqueConstraint(name = "uq_daily_activity",
//                 columnNames = {"user_id", "activity_date"}))
// @Getter
// @Setter
// @NoArgsConstructor
// @AllArgsConstructor
// @Builder
// public class DailyActivity extends BaseEntity {
//
//     @Column(name = "user_id", nullable = false)
//     private Long userId;
//
//     @Column(name = "activity_date", nullable = false)
//     private LocalDate activityDate;
//
//     @Column(name = "xp_earned", nullable = false)
//     @Builder.Default
//     private int xpEarned = 0;
//
//     @Column(name = "reviews_done", nullable = false)
//     @Builder.Default
//     private int reviewsDone = 0;
//
//     @Column(name = "chars_written", nullable = false)
//     @Builder.Default
//     private int charsWritten = 0;
//
//     @Column(name = "study_ms", nullable = false)
//     @Builder.Default
//     private int studyMs = 0;
//
//     @Column(name = "goal_met", nullable = false)
//     @Builder.Default
//     private boolean goalMet = false;
// }
