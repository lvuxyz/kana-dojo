package com.japanese.learning.web.dto;

import com.japanese.learning.domain.enums.TypingContentType;
import com.japanese.learning.domain.enums.TypingInputMethod;
import com.japanese.learning.domain.enums.TypingMode;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.time.Instant;
import java.util.List;

public final class TypingDtos {

    private TypingDtos() {
    }

    /** Số đo thô của một lượt gõ. Điểm không nằm ở đây: server tự tính lại. */
    public record TypingSessionRequest(
            @NotNull(message = "Thiếu cách nhập")
            TypingInputMethod inputMethod,

            @NotNull(message = "Thiếu loại nội dung")
            TypingContentType contentType,

            @NotNull(message = "Thiếu chế độ")
            TypingMode mode,

            @NotNull(message = "Thiếu thời gian gõ")
            @Min(value = 1000, message = "Lượt gõ phải dài ít nhất 1 giây")
            @Max(value = 3_600_000, message = "Lượt gõ không được dài quá 1 giờ")
            Integer durationMs,

            @NotNull(message = "Thiếu số phím đúng")
            @PositiveOrZero(message = "Số phím đúng không được âm")
            @Max(value = 100_000, message = "Số phím đúng quá lớn")
            Integer correctKeys,

            @NotNull(message = "Thiếu số phím sai")
            @PositiveOrZero(message = "Số phím sai không được âm")
            @Max(value = 100_000, message = "Số phím sai quá lớn")
            Integer missKeys,

            @NotNull(message = "Thiếu số kana đã gõ")
            @PositiveOrZero(message = "Số kana không được âm")
            @Max(value = 100_000, message = "Số kana quá lớn")
            Integer charsTyped,

            @NotNull(message = "Thiếu số câu đã xong")
            @PositiveOrZero(message = "Số câu không được âm")
            @Max(value = 10_000, message = "Số câu quá lớn")
            Integer phrasesCompleted) {
    }

    public record TypingResultDto(Long sessionId,
                                  int score,
                                  double kpm,
                                  double accuracy,
                                  int xpEarned,
                                  int personalBest,
                                  boolean newBest) {
    }

    public record TypingBestDto(TypingInputMethod inputMethod,
                                TypingContentType contentType,
                                TypingMode mode,
                                int bestScore,
                                double bestKpm,
                                double bestAccuracy,
                                long plays,
                                Instant lastPlayedAt) {
    }

    public record TypingSessionDto(Long id,
                                   TypingInputMethod inputMethod,
                                   TypingContentType contentType,
                                   TypingMode mode,
                                   int score,
                                   double kpm,
                                   double accuracy,
                                   int durationMs,
                                   Instant createdAt) {
    }

    public record TypingStatsDto(long totalSessions,
                                 long totalDurationMs,
                                 List<TypingBestDto> bests,
                                 List<TypingSessionDto> recent) {
    }
}
