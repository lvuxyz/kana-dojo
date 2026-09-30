package com.japanese.learning.domain.entity;

import com.japanese.learning.domain.enums.TypingContentType;
import com.japanese.learning.domain.enums.TypingInputMethod;
import com.japanese.learning.domain.enums.TypingMode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Một lượt luyện gõ đã chấm. Chỉ ghi thêm — là dữ liệu cho kỷ lục và lịch sử tiến bộ. */
@Entity
@Table(name = "typing_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TypingSession extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "input_method", nullable = false, length = 8)
    private TypingInputMethod inputMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "content_type", nullable = false, length = 12)
    private TypingContentType contentType;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode", nullable = false, length = 16)
    private TypingMode mode;

    @Column(name = "duration_ms", nullable = false)
    private int durationMs;

    @Column(name = "correct_keys", nullable = false)
    private int correctKeys;

    @Column(name = "miss_keys", nullable = false)
    private int missKeys;

    @Column(name = "chars_typed", nullable = false)
    private int charsTyped;

    @Column(name = "phrases_completed", nullable = false)
    private int phrasesCompleted;

    @Column(name = "kpm", nullable = false)
    private double kpm;

    @Column(name = "accuracy", nullable = false)
    private double accuracy;

    @Column(name = "score", nullable = false)
    private int score;

    @Column(name = "xp_earned", nullable = false)
    private int xpEarned;
}
