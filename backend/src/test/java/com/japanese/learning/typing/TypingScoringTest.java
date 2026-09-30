// ĐANG TẮT — đồng bộ luyện gõ lên máy chủ (lưu kỷ lục, cộng XP/streak theo tài khoản).
// Phòng luyện gõ hiện chạy hoàn toàn trên máy người dùng (localStorage), nên mã này được giữ lại dưới dạng
// comment. Cách bật lại: docs/TYPING.md, mục "Mã đồng bộ máy chủ (đang tắt)".
//
// package com.japanese.learning.typing;
//
// import com.japanese.learning.domain.enums.TypingMode;
// import org.junit.jupiter.api.DisplayName;
// import org.junit.jupiter.api.Test;
//
// import static org.assertj.core.api.Assertions.assertThat;
// import static org.assertj.core.api.Assertions.within;
//
// /** Cùng bộ ví dụ với web/src/lib/typing/score.test.ts để hai phía không lệch công thức. */
// class TypingScoringTest {
//
//     @Test
//     @DisplayName("KPM là phím đúng trên phút")
//     void kpm() {
//         assertThat(TypingScoring.kpm(150, 60_000)).isEqualTo(150.0);
//         assertThat(TypingScoring.kpm(100, 30_000)).isEqualTo(200.0);
//         assertThat(TypingScoring.kpm(10, 0)).isZero();
//     }
//
//     @Test
//     @DisplayName("Độ chính xác; chưa gõ gì coi như tuyệt đối")
//     void accuracy() {
//         assertThat(TypingScoring.accuracy(90, 10)).isCloseTo(0.9, within(1e-9));
//         assertThat(TypingScoring.accuracy(0, 0)).isEqualTo(1.0);
//         assertThat(TypingScoring.accuracy(0, 5)).isZero();
//     }
//
//     @Test
//     @DisplayName("Điểm = KPM × chính xác³, làm tròn")
//     void score() {
//         assertThat(TypingScoring.score(TypingMode.PASSAGE, 200, 0, 60_000)).isEqualTo(200);
//         assertThat(TypingScoring.score(TypingMode.TIME_ATTACK, 180, 20, 60_000))
//                 .isEqualTo((int) Math.round(180 * 0.9 * 0.9 * 0.9));
//         assertThat(TypingScoring.score(TypingMode.PASSAGE, 0, 0, 60_000)).isZero();
//     }
//
//     @Test
//     @DisplayName("Sinh tử: điểm là số phím đúng liên tiếp")
//     void suddenDeath() {
//         assertThat(TypingScoring.score(TypingMode.SUDDEN_DEATH, 87, 1, 30_000)).isEqualTo(87);
//     }
//
//     @Test
//     @DisplayName("XP luyện gõ tỉ lệ với số phím đúng, có sàn và trần")
//     void typingXp() {
//         assertThat(TypingScoring.xp(19)).isZero();
//         assertThat(TypingScoring.xp(20)).isEqualTo(5 + 2);
//         assertThat(TypingScoring.xp(150)).isEqualTo(5 + 15);
//         assertThat(TypingScoring.xp(10_000)).isEqualTo(50);
//     }
// }
