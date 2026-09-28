package com.japanese.learning.it;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Quiz mẫu trong V3 và luồng làm bài: bắt đầu → nộp → chấm (SPEC §5 Quiz). */
class QuizFlowTest extends IntegrationTest {

    long quizId(String quizType) {
        return count("select min(id) from quizzes where quiz_type = ?", quizType);
    }

    @Test
    @DisplayName("Danh sách quiz là Page, gồm 4 bài đã seed")
    void listIsPaged() throws Exception {
        TestUser user = register();

        getAs(user, "/api/v1/quizzes")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(4))
                .andExpect(jsonPath("$.totalElements").value(4))
                .andExpect(jsonPath("$.content[0].questionCount").isNumber());
    }

    @Test
    @DisplayName("Đề bài không bao giờ lộ đáp án")
    void detailHidesAnswers() throws Exception {
        TestUser user = register();

        JsonNode detail = body(getAs(user, "/api/v1/quizzes/" + quizId("KANA_READING")).andExpect(status().isOk()));

        assertThat(detail.get("questions")).hasSize(10);
        for (JsonNode question : detail.get("questions")) {
            assertThat(question.has("correctAnswer")).isFalse();
            assertThat(question.get("options")).hasSize(4);
        }
    }

    @Test
    @DisplayName("Trả lời đúng hết được 100 điểm; so khớp bỏ khoảng trắng và hoa thường")
    void allCorrect() throws Exception {
        TestUser user = register();
        long quiz = quizId("ROMAJI_INPUT");
        long attempt = startAttempt(user, quiz);

        List<Map<String, Object>> answers = new ArrayList<>();
        jdbc.query("select id, correct_answer from questions where quiz_id = ?", rs -> {
            answers.add(Map.of("questionId", rs.getLong("id"),
                    "givenAnswer", "  " + rs.getString("correct_answer").toUpperCase() + " "));
        }, quiz);

        JsonNode result = body(postAs(user, "/api/v1/quiz-attempts/" + attempt + "/submit", Map.of("answers", answers))
                .andExpect(status().isOk()));

        int total = answers.size();
        assertThat(result.get("score").asInt()).isEqualTo(100);
        assertThat(result.get("correctCount").asInt()).isEqualTo(total);
        // 20 cơ bản + 5/câu đúng, cộng 50 thưởng vì vượt mục tiêu ngày mặc định (50 XP).
        assertThat(result.get("xpEarned").asInt()).isEqualTo(20 + 5 * total + 50);
        assertThat(result.get("answers")).allSatisfy(a -> assertThat(a.get("correct").asBoolean()).isTrue());
    }

    @Test
    @DisplayName("Câu không gửi tính là sai: điểm tính trên tổng số câu của đề")
    void unansweredCountsAsWrong() throws Exception {
        TestUser user = register();
        long quiz = quizId("KANA_READING");
        long attempt = startAttempt(user, quiz);
        long firstQuestion = count("select min(id) from questions where quiz_id = ?", quiz);
        String correct = jdbc.queryForObject(
                "select correct_answer from questions where id = ?", String.class, firstQuestion);

        JsonNode result = body(postAs(user, "/api/v1/quiz-attempts/" + attempt + "/submit",
                Map.of("answers", List.of(Map.of("questionId", firstQuestion, "givenAnswer", correct))))
                .andExpect(status().isOk()));

        assertThat(result.get("correctCount").asInt()).isEqualTo(1);
        assertThat(result.get("totalCount").asInt()).isEqualTo(10);
        assertThat(result.get("score").asInt()).isEqualTo(10);
    }

    @Test
    @DisplayName("Một lượt chỉ nộp được một lần, và chỉ chủ lượt mới nộp được")
    void submitOnceByOwnerOnly() throws Exception {
        TestUser owner = register();
        TestUser stranger = register();
        long quiz = quizId("VOCAB_MEANING");
        long attempt = startAttempt(owner, quiz);
        long question = count("select min(id) from questions where quiz_id = ?", quiz);
        Map<String, Object> payload = Map.of("answers", List.of(Map.of("questionId", question, "givenAnswer", "x")));

        postAs(stranger, "/api/v1/quiz-attempts/" + attempt + "/submit", payload).andExpect(status().isNotFound());
        postAs(owner, "/api/v1/quiz-attempts/" + attempt + "/submit", payload).andExpect(status().isOk());
        postAs(owner, "/api/v1/quiz-attempts/" + attempt + "/submit", payload).andExpect(status().isBadRequest());
    }

    private long startAttempt(TestUser user, long quiz) throws Exception {
        return body(postAs(user, "/api/v1/quizzes/" + quiz + "/attempts", null).andExpect(status().isOk()))
                .get("attemptId").asLong();
    }
}
