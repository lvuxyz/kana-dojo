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
// @Entity
// @Table(name = "quiz_answers",
//         uniqueConstraints = @UniqueConstraint(name = "uq_quiz_answers",
//                 columnNames = {"attempt_id", "question_id"}))
// @Getter
// @Setter
// @NoArgsConstructor
// @AllArgsConstructor
// @Builder
// public class QuizAnswer extends BaseEntity {
//
//     @Column(name = "attempt_id", nullable = false)
//     private Long attemptId;
//
//     @Column(name = "question_id", nullable = false)
//     private Long questionId;
//
//     @Column(name = "given_answer")
//     private String givenAnswer;
//
//     @Column(name = "is_correct", nullable = false)
//     @Builder.Default
//     private boolean correct = false;
// }
