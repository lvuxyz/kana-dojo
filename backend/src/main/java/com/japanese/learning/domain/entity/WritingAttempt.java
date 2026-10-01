// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.domain.entity;
//
// import com.japanese.learning.domain.StrokeError;
// import com.japanese.learning.domain.enums.WritingMode;
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
// import org.hibernate.annotations.JdbcTypeCode;
// import org.hibernate.type.SqlTypes;
//
// import java.util.ArrayList;
// import java.util.List;
//
// @Entity
// @Table(name = "writing_attempts")
// @Getter
// @Setter
// @NoArgsConstructor
// @AllArgsConstructor
// @Builder
// public class WritingAttempt extends BaseEntity {
//
//     @Column(name = "user_id", nullable = false)
//     private Long userId;
//
//     @Column(name = "kana_character_id", nullable = false)
//     private Long kanaCharacterId;
//
//     @Enumerated(EnumType.STRING)
//     @Column(name = "mode", nullable = false, length = 8)
//     private WritingMode mode;
//
//     @Column(name = "avg_score", nullable = false)
//     private short avgScore;
//
//     @JdbcTypeCode(SqlTypes.JSON)
//     @Column(name = "stroke_scores", columnDefinition = "jsonb")
//     @Builder.Default
//     private List<Integer> strokeScores = new ArrayList<>();
//
//     @JdbcTypeCode(SqlTypes.JSON)
//     @Column(name = "stroke_errors", columnDefinition = "jsonb")
//     @Builder.Default
//     private List<StrokeError> strokeErrors = new ArrayList<>();
//
//     @Column(name = "passed", nullable = false)
//     @Builder.Default
//     private boolean passed = false;
//
//     @Column(name = "duration_ms")
//     private Integer durationMs;
// }
