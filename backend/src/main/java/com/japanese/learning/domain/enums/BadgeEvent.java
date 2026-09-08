package com.japanese.learning.domain.enums;

/** Sự kiện kích hoạt việc xét huy hiệu, dùng để giới hạn số truy vấn cần chạy. */
public enum BadgeEvent {
    WRITING_ATTEMPT, REVIEW_GRADED, QUIZ_SUBMITTED, STREAK_UPDATED
}
