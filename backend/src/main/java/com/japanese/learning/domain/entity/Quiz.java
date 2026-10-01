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
// @Entity
// @Table(name = "quizzes")
// @Getter
// @Setter
// @NoArgsConstructor
// @AllArgsConstructor
// @Builder
// public class Quiz extends BaseEntity {
//
//     @Column(name = "title", nullable = false, length = 160)
//     private String title;
//
//     @Column(name = "description")
//     private String description;
//
//     @Column(name = "quiz_type", nullable = false, length = 24)
//     private String quizType;
//
//     @Column(name = "jlpt_level")
//     private Short jlptLevel;
//
//     @Column(name = "time_limit_sec")
//     private Integer timeLimitSec;
//
//     @Column(name = "is_published", nullable = false)
//     @Builder.Default
//     private boolean published = false;
// }
