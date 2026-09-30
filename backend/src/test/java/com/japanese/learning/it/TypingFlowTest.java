package com.japanese.learning.it;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Luyện gõ: ghi lượt, server tự chấm, cộng XP, kỷ lục và thống kê (SPEC §5 Luyện gõ). */
class TypingFlowTest extends IntegrationTest {

    private Map<String, Object> session(String mode, int durationMs, int correct, int miss) {
        Map<String, Object> body = new HashMap<>();
        body.put("inputMethod", "ROMAJI");
        body.put("contentType", "HIRAGANA");
        body.put("mode", mode);
        body.put("durationMs", durationMs);
        body.put("correctKeys", correct);
        body.put("missKeys", miss);
        body.put("charsTyped", correct / 2);
        body.put("phrasesCompleted", 5);
        return body;
    }

    @Test
    @DisplayName("Server tự tính điểm từ số phím, cộng XP vào hoạt động ngày")
    void recordScoresOnServer() throws Exception {
        TestUser user = register();

        // 180 đúng, 20 sai trong 60 giây: KPM 180, chính xác 90% → 180 × 0.9³ = 131.
        JsonNode result = body(postAs(user, "/api/v1/typing/sessions", session("PASSAGE", 60_000, 180, 20))
                .andExpect(status().isOk()));

        assertThat(result.get("score").asInt()).isEqualTo(131);
        assertThat(result.get("kpm").asDouble()).isEqualTo(180.0);
        assertThat(result.get("accuracy").asDouble()).isEqualTo(0.9);
        assertThat(result.get("newBest").asBoolean()).isTrue();
        assertThat(result.get("personalBest").asInt()).isEqualTo(131);
        // 5 + 180/10 = 23 XP, chưa chạm mục tiêu ngày 50 XP nên không có thưởng.
        assertThat(result.get("xpEarned").asInt()).isEqualTo(23);

        assertThat(count("select xp_earned from daily_activity where user_id = ?", user.id())).isEqualTo(23);
        assertThat(count("select study_ms from daily_activity where user_id = ?", user.id())).isEqualTo(60_000);
        assertThat(count("select score from typing_sessions where user_id = ?", user.id())).isEqualTo(131);
    }

    @Test
    @DisplayName("Kỷ lục chỉ đổi khi điểm cao hơn, và tách theo tổ hợp chế độ")
    void personalBest() throws Exception {
        TestUser user = register();
        postAs(user, "/api/v1/typing/sessions", session("PASSAGE", 60_000, 200, 0)).andExpect(status().isOk());

        JsonNode worse = body(postAs(user, "/api/v1/typing/sessions", session("PASSAGE", 60_000, 100, 0))
                .andExpect(status().isOk()));
        assertThat(worse.get("newBest").asBoolean()).isFalse();
        assertThat(worse.get("personalBest").asInt()).isEqualTo(200);

        JsonNode otherMode = body(postAs(user, "/api/v1/typing/sessions", session("TIME_ATTACK", 60_000, 100, 0))
                .andExpect(status().isOk()));
        assertThat(otherMode.get("newBest").asBoolean()).isTrue();

        JsonNode stats = body(getAs(user, "/api/v1/typing/stats").andExpect(status().isOk()));
        assertThat(stats.get("totalSessions").asLong()).isEqualTo(3);
        assertThat(stats.get("totalDurationMs").asLong()).isEqualTo(180_000);
        assertThat(stats.get("recent")).hasSize(3);
        assertThat(stats.get("recent").get(0).get("mode").asText()).isEqualTo("TIME_ATTACK");
        assertThat(stats.get("bests")).hasSize(2);
        JsonNode passage = null;
        for (JsonNode b : stats.get("bests")) {
            if (b.get("mode").asText().equals("PASSAGE")) {
                passage = b;
            }
        }
        assertThat(passage).isNotNull();
        assertThat(passage.get("bestScore").asInt()).isEqualTo(200);
        assertThat(passage.get("plays").asLong()).isEqualTo(2);
    }

    @Test
    @DisplayName("Sinh tử chấm bằng số phím đúng liên tiếp")
    void suddenDeath() throws Exception {
        TestUser user = register();
        JsonNode result = body(postAs(user, "/api/v1/typing/sessions", session("SUDDEN_DEATH", 30_000, 87, 1))
                .andExpect(status().isOk()));
        assertThat(result.get("score").asInt()).isEqualTo(87);
    }

    @Test
    @DisplayName("Lượt quá ngắn không có XP nhưng vẫn được lưu")
    void tooShortForXp() throws Exception {
        TestUser user = register();
        JsonNode result = body(postAs(user, "/api/v1/typing/sessions", session("PASSAGE", 5_000, 10, 0))
                .andExpect(status().isOk()));
        assertThat(result.get("xpEarned").asInt()).isZero();
        assertThat(count("select count(*) from typing_sessions where user_id = ?", user.id())).isEqualTo(1);
    }

    @Test
    @DisplayName("Tốc độ phi thực tế, dữ liệu sai kiểu hoặc thiếu trường đều bị từ chối")
    void rejectsInvalid() throws Exception {
        TestUser user = register();

        postAs(user, "/api/v1/typing/sessions", session("PASSAGE", 1_000, 1_000, 0))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.correctKeys").exists());

        Map<String, Object> badMode = session("PASSAGE", 60_000, 100, 0);
        badMode.put("mode", "MARATHON");
        postAs(user, "/api/v1/typing/sessions", badMode).andExpect(status().isBadRequest());

        Map<String, Object> tooShort = session("PASSAGE", 500, 5, 0);
        postAs(user, "/api/v1/typing/sessions", tooShort)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.durationMs").exists());

        Map<String, Object> negative = session("PASSAGE", 60_000, 100, -1);
        postAs(user, "/api/v1/typing/sessions", negative).andExpect(status().isBadRequest());

        assertThat(count("select count(*) from typing_sessions where user_id = ?", user.id())).isZero();
    }

    @Test
    @DisplayName("Cần đăng nhập")
    void requiresAuth() throws Exception {
        mvc.perform(get("/api/v1/typing/stats")).andExpect(status().isUnauthorized());
        postAs(null, "/api/v1/typing/sessions", session("PASSAGE", 60_000, 100, 0))
                .andExpect(status().isUnauthorized());
    }
}
