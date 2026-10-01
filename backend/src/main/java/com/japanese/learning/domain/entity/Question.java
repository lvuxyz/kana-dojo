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
// import org.hibernate.annotations.JdbcTypeCode;
// import org.hibernate.type.SqlTypes;
//
// import java.util.ArrayList;
// import java.util.List;
//
// @Entity
// @Table(name = "questions")
// @Getter
// @Setter
// @NoArgsConstructor
// @AllArgsConstructor
// @Builder
// public class Question extends BaseEntity {
//
//     @Column(name = "quiz_id", nullable = false)
//     private Long quizId;
//
//     @Column(name = "prompt", nullable = false)
//     private String prompt;
//
//     @Column(name = "question_type", nullable = false, length = 24)
//     private String questionType;
//
//     @JdbcTypeCode(SqlTypes.JSON)
//     @Column(name = "options", columnDefinition = "jsonb")
//     @Builder.Default
//     private List<String> options = new ArrayList<>();
//
//     /** Không bao giờ được lộ ra DTO trước khi người học nộp bài. */
//     @Column(name = "correct_answer", nullable = false)
//     private String correctAnswer;
//
//     @Column(name = "explanation_vi")
//     private String explanationVi;
//
//     @Column(name = "position", nullable = false)
//     @Builder.Default
//     private Integer position = 0;
// }
