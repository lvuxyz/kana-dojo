package com.japanese.learning.common;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/** Vượt hạn mức của gói cước. Luôn trả về HTTP 429 kèm tên tính năng bị chặn. */
@Getter
public class QuotaExceededException extends ApiException {

    private final String featureKey;
    private final int limitValue;

    public QuotaExceededException(String featureKey, int limitValue, String detail) {
        super(HttpStatus.TOO_MANY_REQUESTS, ErrorTypes.QUOTA_EXCEEDED, "Vượt hạn mức gói cước", detail);
        this.featureKey = featureKey;
        this.limitValue = limitValue;
    }
}
