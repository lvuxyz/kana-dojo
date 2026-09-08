package com.japanese.learning.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Bật lịch chạy nền cho việc chốt bảng xếp hạng tuần và hồi thẻ băng streak. */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
