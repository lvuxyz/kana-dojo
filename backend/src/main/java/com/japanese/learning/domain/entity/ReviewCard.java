// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.domain.entity;
//
// import com.japanese.learning.domain.enums.CardState;
// import com.japanese.learning.domain.enums.ItemType;
// import com.japanese.learning.srs.FsrsEngine;
// import jakarta.persistence.Column;
// import jakarta.persistence.Entity;
// import jakarta.persistence.EnumType;
// import jakarta.persistence.Enumerated;
// import jakarta.persistence.Table;
// import jakarta.persistence.UniqueConstraint;
// import lombok.AllArgsConstructor;
// import lombok.Builder;
// import lombok.Getter;
// import lombok.NoArgsConstructor;
// import lombok.Setter;
//
// import java.time.Instant;
//
// /** Một thẻ ôn = một khía cạnh (viết / đọc / nghĩa) của một mục nội dung với một người học. */
// @Entity
// @Table(name = "review_cards",
//         uniqueConstraints = @UniqueConstraint(name = "uq_review_cards",
//                 columnNames = {"user_id", "item_type", "item_id"}))
// @Getter
// @Setter
// @NoArgsConstructor
// @AllArgsConstructor
// @Builder
// public class ReviewCard extends BaseEntity {
//
//     @Column(name = "user_id", nullable = false)
//     private Long userId;
//
//     @Enumerated(EnumType.STRING)
//     @Column(name = "item_type", nullable = false, length = 24)
//     private ItemType itemType;
//
//     @Column(name = "item_id", nullable = false)
//     private Long itemId;
//
//     @Enumerated(EnumType.STRING)
//     @Column(name = "state", nullable = false, length = 12)
//     @Builder.Default
//     private CardState state = CardState.NEW;
//
//     @Column(name = "stability", nullable = false)
//     @Builder.Default
//     private double stability = 0.0;
//
//     @Column(name = "difficulty", nullable = false)
//     @Builder.Default
//     private double difficulty = 0.0;
//
//     @Column(name = "due_at", nullable = false)
//     private Instant dueAt;
//
//     @Column(name = "last_reviewed_at")
//     private Instant lastReviewedAt;
//
//     @Column(name = "reps", nullable = false)
//     @Builder.Default
//     private int reps = 0;
//
//     @Column(name = "lapses", nullable = false)
//     @Builder.Default
//     private int lapses = 0;
//
//     @Column(name = "learning_step", nullable = false)
//     @Builder.Default
//     private short learningStep = 0;
//
//     @Column(name = "suspended", nullable = false)
//     @Builder.Default
//     private boolean suspended = false;
//
//     public FsrsEngine.FsrsState toFsrsState() {
//         return new FsrsEngine.FsrsState(stability, difficulty, state, learningStep, reps, lapses);
//     }
//
//     public void applyFsrsState(FsrsEngine.FsrsState next) {
//         this.stability = next.stability();
//         this.difficulty = next.difficulty();
//         this.state = next.state();
//         this.learningStep = (short) next.learningStep();
//         this.reps = next.reps();
//         this.lapses = next.lapses();
//     }
//
//     /**
//      * Số ngày thực tế đã trôi kể từ lần ôn trước. Thẻ chưa từng ôn trả về 0
//      * để công thức FSRS coi như R = 1 và không suy diễn từ dữ liệu không tồn tại.
//      */
//     public double elapsedDaysAt(Instant now) {
//         if (lastReviewedAt == null) {
//             return 0.0;
//         }
//         double seconds = (now.toEpochMilli() - lastReviewedAt.toEpochMilli()) / 1000.0;
//         return Math.max(seconds / 86400.0, 0.0);
//     }
// }
