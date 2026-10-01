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
// import java.time.Instant;
//
// @Entity
// @Table(name = "quiz_attempts")
// @Getter
// @Setter
// @NoArgsConstructor
// @AllArgsConstructor
// @Builder
// public class QuizAttempt extends BaseEntity {
//
//     @Column(name = "user_id", nullable = false)
//     private Long userId;
//
//     @Column(name = "quiz_id", nullable = false)
//     private Long quizId;
//
//     @Column(name = "score")
//     private Short score;
//
//     @Column(name = "correct_count", nullable = false)
//     @Builder.Default
//     private int correctCount = 0;
//
//     @Column(name = "total_count", nullable = false)
//     @Builder.Default
//     private int totalCount = 0;
//
//     @Column(name = "duration_ms")
//     private Integer durationMs;
//
//     @Column(name = "started_at", nullable = false)
//     private Instant startedAt;
//
//     @Column(name = "submitted_at")
//     private Instant submittedAt;
// }
