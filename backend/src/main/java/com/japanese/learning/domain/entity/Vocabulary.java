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
// @Table(name = "vocabulary")
// @Getter
// @Setter
// @NoArgsConstructor
// @AllArgsConstructor
// @Builder
// public class Vocabulary extends BaseEntity {
//
//     @Column(name = "word", length = 64)
//     private String word;
//
//     @Column(name = "reading", length = 64)
//     private String reading;
//
//     @Column(name = "romaji", length = 64)
//     private String romaji;
//
//     @Column(name = "meaning_vi", nullable = false)
//     private String meaningVi;
//
//     @Column(name = "meaning_en")
//     private String meaningEn;
//
//     /** 5 = N5 (dễ nhất) đến 1 = N1. */
//     @Column(name = "jlpt_level")
//     private Short jlptLevel;
//
//     @Column(name = "part_of_speech", length = 24)
//     private String partOfSpeech;
//
//     @Column(name = "example_ja")
//     private String exampleJa;
//
//     @Column(name = "example_vi")
//     private String exampleVi;
//
//     @Column(name = "audio_url")
//     private String audioUrl;
// }
