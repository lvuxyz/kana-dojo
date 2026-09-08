package com.japanese.learning.domain;

import com.japanese.learning.domain.enums.StrokeErrorReason;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** Một lỗi nét cụ thể do bộ chấm phía client phát hiện, lưu nguyên vẹn vào jsonb. */
public record StrokeError(@Min(0) int index, @NotNull StrokeErrorReason reason) {
}
