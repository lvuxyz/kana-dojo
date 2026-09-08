package com.japanese.learning.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.time.Duration;
import java.util.List;

/** Toàn bộ cấu hình riêng của ứng dụng, gom về một chỗ và bind bằng constructor. */
@ConfigurationProperties(prefix = "app")
public record AppProperties(@DefaultValue Jwt jwt,
                            @DefaultValue Cors cors,
                            @DefaultValue Google google,
                            @DefaultValue Srs srs,
                            @DefaultValue Gamification gamification,
                            @DefaultValue RateLimit rateLimit) {

    public record Jwt(@DefaultValue("") String secret,
                      @DefaultValue("kana-dojo") String issuer,
                      @DefaultValue("15m") Duration accessTokenTtl,
                      @DefaultValue("30d") Duration refreshTokenTtl) {
    }

    public record Cors(@DefaultValue("http://localhost:3000") List<String> allowedOrigins) {
    }

    public record Google(@DefaultValue("") String clientId) {
    }

    public record Srs(@DefaultValue("10") int newCardsPerDay,
                      @DefaultValue("0.90") double desiredRetention) {
    }

    public record Gamification(@DefaultValue("2") int maxStreakFreezes,
                               @DefaultValue("Asia/Ho_Chi_Minh") String zone) {
    }

    public record RateLimit(@DefaultValue("10") int authRequestsPerMinute) {
    }
}
