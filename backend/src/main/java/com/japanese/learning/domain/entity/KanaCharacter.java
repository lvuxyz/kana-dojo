// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.domain.entity;
//
// import com.japanese.learning.domain.enums.KanaGroup;
// import com.japanese.learning.domain.enums.Script;
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
// @Entity
// @Table(name = "kana_characters")
// @Getter
// @Setter
// @NoArgsConstructor
// @AllArgsConstructor
// @Builder
// public class KanaCharacter extends BaseEntity {
//
//     /** "character" là từ khoá của PostgreSQL nên phải trích dẫn tường minh. */
//     @Column(name = "\"character\"", nullable = false, unique = true, length = 4)
//     private String character;
//
//     /** Chuỗi các glyph hợp thành, ví dụ "きゃ" gồm hai glyph "き" và "ゃ". */
//     @Column(name = "glyph_sequence", nullable = false, length = 4)
//     private String glyphSequence;
//
//     @Column(name = "romaji", nullable = false, length = 8)
//     private String romaji;
//
//     @Enumerated(EnumType.STRING)
//     @Column(name = "script", nullable = false, length = 12)
//     private Script script;
//
//     @Enumerated(EnumType.STRING)
//     @Column(name = "kana_group", nullable = false, length = 12)
//     private KanaGroup kanaGroup;
//
//     @Column(name = "row_key", nullable = false, length = 8)
//     private String rowKey;
//
//     @Column(name = "col_index", nullable = false)
//     private Short colIndex;
//
//     @Column(name = "stroke_count", nullable = false)
//     private Short strokeCount;
//
//     @Column(name = "reading_vi", length = 64)
//     private String readingVi;
//
//     @Column(name = "display_order", nullable = false)
//     private Integer displayOrder;
// }
