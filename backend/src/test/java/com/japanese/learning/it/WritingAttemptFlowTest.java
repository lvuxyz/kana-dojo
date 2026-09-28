package com.japanese.learning.it;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * {@code POST /writing/attempts}: một giao dịch làm đủ 5 việc — lưu bài viết, suy grade,
 * cập nhật thẻ FSRS, ghi nhật ký ôn, cộng XP/streak và xét huy hiệu (SPEC §5).
 */
class WritingAttemptFlowTest extends IntegrationTest {

    static Map<String, Object> attempt(long kanaId, int score, List<Map<String, Object>> errors) {
        return Map.of(
                "kanaCharacterId", kanaId,
                "mode", "TEST",
                "strokeScores", List.of(score, score, score),
                "strokeErrors", errors,
                "avgScore", score,
                "durationMs", 4000);
    }

    long kanaId(String character) {
        return count("select id from kana_characters where character = ?", character);
    }

    @Test
    @DisplayName("Lần viết đạt đầu tiên ghi đủ 5 bước trong CSDL")
    void firstPassWritesEverything() throws Exception {
        TestUser user = register();
        long a = kanaId("あ");

        JsonNode result = body(postAs(user, "/api/v1/writing/attempts", attempt(a, 95, List.of()))
                .andExpect(status().isOk()));

        assertThat(result.get("passed").asBoolean()).isTrue();
        assertThat(result.get("grade").asInt()).isEqualTo(4);
        assertThat(result.get("xpEarned").asInt()).isEqualTo(25);
        assertThat(result.at("/card/state").asText()).as("Easy tốt nghiệp thẳng lên REVIEW").isEqualTo("REVIEW");
        assertThat(result.get("newBadges")).extracting(JsonNode::asText).containsExactly("FIRST_STROKE");

        assertThat(count("select count(*) from writing_attempts where user_id = ? and passed", user.id())).isEqualTo(1);
        assertThat(count("select count(*) from review_cards where user_id = ? and item_type = 'KANA_WRITING'"
                + " and item_id = ? and state = 'REVIEW'", user.id(), a)).isEqualTo(1);
        assertThat(count("select count(*) from review_logs where user_id = ? and grade = 4 and score = 95", user.id()))
                .isEqualTo(1);
        assertThat(count("select xp_total from user_stats where user_id = ?", user.id())).isEqualTo(25);
        assertThat(count("select xp_earned from daily_activity where user_id = ?", user.id())).isEqualTo(25);
        assertThat(count("select count(*) from user_badges ub join badges b on b.id = ub.badge_id"
                + " where ub.user_id = ? and b.code = 'FIRST_STROKE'", user.id())).isEqualTo(1);
    }

    @Test
    @DisplayName("Viết đạt lần nữa chỉ được XP ôn thường và không nhận lại huy hiệu")
    void secondPassGetsReviewXp() throws Exception {
        TestUser user = register();
        long ka = kanaId("か");
        postAs(user, "/api/v1/writing/attempts", attempt(ka, 95, List.of())).andExpect(status().isOk());

        JsonNode again = body(postAs(user, "/api/v1/writing/attempts", attempt(ka, 95, List.of()))
                .andExpect(status().isOk()));

        assertThat(again.get("xpEarned").asInt()).isEqualTo(10);
        assertThat(again.get("newBadges")).isEmpty();
        assertThat(count("select count(*) from review_cards where user_id = ?", user.id()))
                .as("vẫn một thẻ cho một ký tự").isEqualTo(1);
        assertThat(count("select count(*) from review_logs where user_id = ?", user.id())).isEqualTo(2);
    }

    @Test
    @DisplayName("Có nét hỏng thì grade 1, không đạt và thẻ quay về bước học")
    void failedStrokeIsAgain() throws Exception {
        TestUser user = register();

        JsonNode result = body(postAs(user, "/api/v1/writing/attempts",
                attempt(kanaId("さ"), 90, List.of(Map.of("index", 1, "reason", "REVERSED"))))
                .andExpect(status().isOk()));

        assertThat(result.get("passed").asBoolean()).isFalse();
        assertThat(result.get("grade").asInt()).isEqualTo(1);
        assertThat(result.get("xpEarned").asInt()).isEqualTo(3);
        assertThat(result.at("/card/state").asText()).isEqualTo("LEARNING");
        assertThat(result.get("newBadges")).isEmpty();
        assertThat(count("select count(*) from writing_attempts where user_id = ? and not passed", user.id()))
                .as("bài không đạt vẫn được lưu để cải thiện bộ chấm").isEqualTo(1);
    }

    @Test
    @DisplayName("Ký tự không tồn tại trả 404 và không để lại dữ liệu")
    void unknownKanaIsNotFound() throws Exception {
        TestUser user = register();

        postAs(user, "/api/v1/writing/attempts", attempt(999_999, 95, List.of()))
                .andExpect(status().isNotFound());

        assertThat(count("select count(*) from writing_attempts where user_id = ?", user.id())).isZero();
        assertThat(count("select count(*) from review_cards where user_id = ?", user.id())).isZero();
    }

    @Test
    @DisplayName("Dữ liệu sai định dạng bị chặn ở validation")
    void invalidPayloadIsRejected() throws Exception {
        TestUser user = register();

        postAs(user, "/api/v1/writing/attempts", Map.of(
                "kanaCharacterId", kanaId("あ"), "mode", "TEST",
                "strokeScores", List.of(), "avgScore", 150))
                .andExpect(status().isBadRequest());
    }
}
