// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.it;
//
// import com.fasterxml.jackson.databind.JsonNode;
// import org.junit.jupiter.api.DisplayName;
// import org.junit.jupiter.api.Test;
//
// import java.util.Map;
//
// import static org.assertj.core.api.Assertions.assertThat;
// import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
// import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
//
// /**
//  * Hàng đợi ôn và chấm thẻ. Khoá luôn hình dạng JSON mà {@code web/src/lib/types.ts} dựa vào —
//  * frontend từng đọc hàng đợi như một mảng và vỡ trang Ôn tập.
//  */
// class ReviewQueueFlowTest extends IntegrationTest {
//
//     @Test
//     @DisplayName("Hàng đợi là {content, dueCount, newCount}, thẻ kana có character/romaji")
//     void queueShape() throws Exception {
//         TestUser user = register();
//
//         getAs(user, "/api/v1/reviews/queue?limit=5")
//                 .andExpect(status().isOk())
//                 .andExpect(jsonPath("$.content.length()").value(5))
//                 .andExpect(jsonPath("$.dueCount").value(0))
//                 .andExpect(jsonPath("$.newCount").value(5))
//                 .andExpect(jsonPath("$.content[0].itemType").value("KANA_WRITING"))
//                 .andExpect(jsonPath("$.content[0].character").isString())
//                 .andExpect(jsonPath("$.content[0].romaji").isString())
//                 .andExpect(jsonPath("$.content[0].state").value("NEW"));
//     }
//
//     @Test
//     @DisplayName("Lọc theo loại thẻ từ vựng trả word/meaningVi từ dữ liệu V3")
//     void vocabularyCards() throws Exception {
//         TestUser user = register();
//
//         getAs(user, "/api/v1/reviews/queue?limit=3&types=VOCAB_MEANING")
//                 .andExpect(status().isOk())
//                 .andExpect(jsonPath("$.content.length()").value(3))
//                 .andExpect(jsonPath("$.content[0].itemType").value("VOCAB_MEANING"))
//                 .andExpect(jsonPath("$.content[0].word").isString())
//                 .andExpect(jsonPath("$.content[0].meaningVi").isString());
//     }
//
//     @Test
//     @DisplayName("Không vượt hạn mức 10 thẻ mới mỗi ngày")
//     void newCardQuota() throws Exception {
//         TestUser user = register();
//
//         body(getAs(user, "/api/v1/reviews/queue?limit=50").andExpect(status().isOk()));
//         JsonNode second = body(getAs(user, "/api/v1/reviews/queue?limit=50").andExpect(status().isOk()));
//
//         assertThat(second.get("newCount").asInt()).isLessThanOrEqualTo(10);
//         assertThat(count("select count(*) from review_cards where user_id = ?", user.id())).isEqualTo(10);
//     }
//
//     @Test
//     @DisplayName("Chấm Good cho thẻ mới: sang bước học kế, ghi nhật ký, +10 XP")
//     void gradeCard() throws Exception {
//         TestUser user = register();
//         long cardId = body(getAs(user, "/api/v1/reviews/queue?limit=1").andExpect(status().isOk()))
//                 .at("/content/0/cardId").asLong();
//
//         JsonNode graded = body(postAs(user, "/api/v1/reviews/grade",
//                 Map.of("cardId", cardId, "grade", 3, "durationMs", 1500))
//                 .andExpect(status().isOk()));
//
//         assertThat(graded.get("state").asText()).isEqualTo("LEARNING");
//         assertThat(graded.get("xpEarned").asInt()).isEqualTo(10);
//         assertThat(graded.get("nextDueAt").asText()).isNotBlank();
//         assertThat(count("select count(*) from review_logs where card_id = ? and grade = 3", cardId)).isEqualTo(1);
//     }
//
//     @Test
//     @DisplayName("Không chấm được thẻ của người khác")
//     void cannotGradeOthersCard() throws Exception {
//         TestUser owner = register();
//         TestUser stranger = register();
//         long cardId = body(getAs(owner, "/api/v1/reviews/queue?limit=1").andExpect(status().isOk()))
//                 .at("/content/0/cardId").asLong();
//
//         postAs(stranger, "/api/v1/reviews/grade", Map.of("cardId", cardId, "grade", 4, "durationMs", 0))
//                 .andExpect(status().isNotFound());
//     }
// }
