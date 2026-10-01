// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.domain.entity;
//
// import com.japanese.learning.domain.enums.CardState;
// import jakarta.persistence.Column;
// import jakarta.persistence.Entity;
// import jakarta.persistence.EnumType;
// import jakarta.persistence.Enumerated;
// import jakarta.persistence.Table;
// import lombok.AllArgsConstructor;
// import lombok.Builder;
// import lombok.Getter;
// import lombok.NoArgsConstructor;
// import lombok.Setter;
//
// import java.time.Instant;
//
// /**
//  * Nhật ký ôn tập, chỉ ghi thêm và không bao giờ sửa.
//  * Đây là tập dữ liệu để về sau huấn luyện lại 21 tham số FSRS riêng cho từng người học.
//  */
// @Entity
// @Table(name = "review_logs")
// @Getter
// @Setter
// @NoArgsConstructor
// @AllArgsConstructor
// @Builder
// public class ReviewLog extends BaseEntity {
//
//     @Column(name = "card_id", nullable = false)
//     private Long cardId;
//
//     @Column(name = "user_id", nullable = false)
//     private Long userId;
//
//     @Column(name = "grade", nullable = false)
//     private short grade;
//
//     /** Điểm nét viết gốc 0..100; NULL với thẻ không phải bài viết. */
//     @Column(name = "score")
//     private Short score;
//
//     @Enumerated(EnumType.STRING)
//     @Column(name = "state_before", nullable = false, length = 12)
//     private CardState stateBefore;
//
//     @Column(name = "stability_before", nullable = false)
//     private double stabilityBefore;
//
//     @Column(name = "stability_after", nullable = false)
//     private double stabilityAfter;
//
//     @Column(name = "difficulty_before", nullable = false)
//     private double difficultyBefore;
//
//     @Column(name = "difficulty_after", nullable = false)
//     private double difficultyAfter;
//
//     @Column(name = "elapsed_days", nullable = false)
//     private double elapsedDays;
//
//     @Column(name = "scheduled_days", nullable = false)
//     private double scheduledDays;
//
//     @Column(name = "duration_ms")
//     private Integer durationMs;
//
//     @Column(name = "reviewed_at", nullable = false)
//     private Instant reviewedAt;
// }
