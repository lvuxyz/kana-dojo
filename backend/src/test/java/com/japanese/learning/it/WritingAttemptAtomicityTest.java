package com.japanese.learning.it;

import com.japanese.learning.service.BadgeService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.mock.mockito.SpyBean;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Lỗi ở bước cuối (xét huy hiệu) phải kéo lùi cả 4 bước trước: không được còn bài viết,
 * thẻ, nhật ký hay XP "nửa vời". Tách lớp riêng vì {@code @SpyBean} tạo Spring context riêng.
 */
class WritingAttemptAtomicityTest extends IntegrationTest {

    @SpyBean
    BadgeService badgeService;

    @Test
    @DisplayName("Lỗi ở bước xét huy hiệu rollback toàn bộ lượt viết")
    void failureInLastStepRollsBackEverything() throws Exception {
        TestUser user = register();
        long kanaId = count("select id from kana_characters where character = 'あ'");
        doThrow(new IllegalStateException("lỗi giả lập")).when(badgeService).evaluate(anyLong(), any());

        postAs(user, "/api/v1/writing/attempts",
                WritingAttemptFlowTest.attempt(kanaId, 95, List.of()))
                .andExpect(status().is5xxServerError());

        assertThat(count("select count(*) from writing_attempts where user_id = ?", user.id())).isZero();
        assertThat(count("select count(*) from review_cards where user_id = ?", user.id())).isZero();
        assertThat(count("select count(*) from review_logs where user_id = ?", user.id())).isZero();
        assertThat(count("select count(*) from daily_activity where user_id = ?", user.id())).isZero();
        assertThat(count("select coalesce(sum(xp_total), 0) from user_stats where user_id = ?", user.id())).isZero();
    }
}
