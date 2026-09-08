package com.japanese.learning.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Dữ liệu nét của một glyph đơn. Khoá chính là chính ký tự vì bảng này bất biến
 * và luôn được tra theo glyph (không bao giờ theo id sinh tự động).
 */
@Entity
@Table(name = "kana_glyphs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KanaGlyph {

    @Id
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "glyph", nullable = false, length = 1, columnDefinition = "char(1)")
    private String glyph;

    /** Mảng thuộc tính `d` của từng nét, theo đúng thứ tự viết. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "stroke_paths", nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private List<String> strokePaths = new ArrayList<>();

    @Column(name = "stroke_count", nullable = false)
    private Integer strokeCount;

    @Column(name = "view_box", nullable = false)
    @Builder.Default
    private Integer viewBox = 109;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @jakarta.persistence.PrePersist
    void onInsert() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
