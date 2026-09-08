package com.japanese.learning.srs;

import com.japanese.learning.domain.enums.CardState;
import com.japanese.learning.srs.FsrsEngine.FsrsResult;
import com.japanese.learning.srs.FsrsEngine.FsrsState;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Kiểm thử FSRS-6. Tất cả đều là hàm thuần nên không cần Spring context.
 */
class FsrsEngineTest {

    private static final Instant NOW = Instant.parse("2026-09-07T10:00:00Z");
    private static final double RETENTION = 0.90;

    @Test
    @DisplayName("Thẻ mới với từng grade cho trạng thái và lịch đúng")
    void newCardForEachGrade() {
        FsrsResult again = FsrsEngine.review(FsrsState.newCard(), 1, 0, NOW, RETENTION);
        assertThat(again.next().state()).isEqualTo(CardState.LEARNING);
        assertThat(again.next().learningStep()).isZero();
        assertThat(again.next().stability()).isEqualTo(FsrsEngine.W[0]);
        assertThat(again.dueAt()).isEqualTo(NOW.plusSeconds(60));
        assertThat(again.next().lapses()).isZero();

        FsrsResult hard = FsrsEngine.review(FsrsState.newCard(), 2, 0, NOW, RETENTION);
        assertThat(hard.next().state()).isEqualTo(CardState.LEARNING);
        assertThat(hard.next().stability()).isEqualTo(FsrsEngine.W[1]);

        FsrsResult good = FsrsEngine.review(FsrsState.newCard(), 3, 0, NOW, RETENTION);
        assertThat(good.next().state()).isEqualTo(CardState.LEARNING);
        assertThat(good.next().learningStep()).isEqualTo(1);
        assertThat(good.next().stability()).isEqualTo(FsrsEngine.W[2]);
        assertThat(good.dueAt()).isEqualTo(NOW.plusSeconds(600));

        // Easy tốt nghiệp ngay, bỏ qua các bước học còn lại.
        FsrsResult easy = FsrsEngine.review(FsrsState.newCard(), 4, 0, NOW, RETENTION);
        assertThat(easy.next().state()).isEqualTo(CardState.REVIEW);
        assertThat(easy.next().stability()).isEqualTo(FsrsEngine.W[3]);
        assertThat(easy.intervalDays()).isGreaterThanOrEqualTo(1);

        // Mọi thẻ mới đều tăng reps đúng một lần.
        for (FsrsResult r : List.of(again, hard, good, easy)) {
            assertThat(r.next().reps()).isEqualTo(1);
            assertThat(r.next().difficulty()).isBetween(1.0, 10.0);
            assertThat(r.next().stability()).isGreaterThan(0.0);
        }
    }

    @Test
    @DisplayName("Chuỗi Good liên tiếp cho khoảng cách ôn tăng dần")
    void repeatedGoodProducesIncreasingIntervals() {
        FsrsState state = FsrsState.newCard();
        double elapsed = 0;
        List<Integer> intervals = new ArrayList<>();

        for (int i = 0; i < 8; i++) {
            FsrsResult result = FsrsEngine.review(state, 3, elapsed, NOW, RETENTION);
            state = result.next();
            if (state.state() == CardState.REVIEW) {
                intervals.add(result.intervalDays());
                elapsed = result.intervalDays();
            } else {
                // Còn trong bước học: thời gian trôi qua tính bằng phút.
                elapsed = FsrsEngine.LEARNING_STEPS_MINUTES[state.learningStep()] / 1440.0;
            }
        }

        assertThat(intervals).hasSizeGreaterThanOrEqualTo(5);
        assertThat(intervals).isSorted();
        for (int i = 1; i < intervals.size(); i++) {
            assertThat(intervals.get(i))
                    .as("khoảng cách lần %d phải lớn hơn lần trước", i)
                    .isGreaterThan(intervals.get(i - 1));
        }
    }

    @Test
    @DisplayName("Một lần quên làm stability giảm và đẩy thẻ về RELEARNING")
    void lapseReducesStability() {
        FsrsState mature = new FsrsState(30.0, 5.0, CardState.REVIEW, 0, 5, 0);

        FsrsResult result = FsrsEngine.review(mature, 1, 30.0, NOW, RETENTION);

        assertThat(result.next().stability()).isLessThan(mature.stability());
        assertThat(result.next().stability()).isGreaterThan(0.0);
        assertThat(result.next().state()).isEqualTo(CardState.RELEARNING);
        assertThat(result.next().lapses()).isEqualTo(1);
        assertThat(result.next().learningStep()).isZero();
        assertThat(result.dueAt()).isEqualTo(NOW.plusSeconds(600));
    }

    @Test
    @DisplayName("Retrievability giảm theo thời gian và luôn nằm trong (0, 1]")
    void retrievabilityDecaysMonotonically() {
        double stability = 10.0;
        double previous = Double.MAX_VALUE;

        for (double t : new double[]{0, 0.5, 1, 5, 10, 30, 100, 365, 3650}) {
            double r = FsrsEngine.retrievability(stability, t);
            assertThat(r).isGreaterThan(0.0).isLessThanOrEqualTo(1.0);
            assertThat(r).isLessThan(previous);
            previous = r;
        }

        assertThat(FsrsEngine.retrievability(stability, 0)).isEqualTo(1.0);
        // Đúng bằng stability thì R phải rơi về mức mục tiêu 90%.
        assertThat(FsrsEngine.retrievability(stability, stability)).isCloseTo(0.9, org.assertj.core.data.Offset.offset(1e-9));
        // Không được chia cho 0 khi thẻ chưa có stability.
        assertThat(FsrsEngine.retrievability(0.0, 5.0)).isGreaterThan(0.0).isLessThanOrEqualTo(1.0);
    }

    @Test
    @DisplayName("Hard cho khoảng cách ngắn hơn Good")
    void hardIsShorterThanGood() {
        FsrsState mature = new FsrsState(30.0, 5.0, CardState.REVIEW, 0, 5, 0);

        int hard = FsrsEngine.review(mature, 2, 30.0, NOW, RETENTION).intervalDays();
        int good = FsrsEngine.review(mature, 3, 30.0, NOW, RETENTION).intervalDays();

        assertThat(hard).isLessThan(good);
    }

    @Test
    @DisplayName("Easy cho khoảng cách dài hơn Good")
    void easyIsLongerThanGood() {
        FsrsState mature = new FsrsState(30.0, 5.0, CardState.REVIEW, 0, 5, 0);

        int good = FsrsEngine.review(mature, 3, 30.0, NOW, RETENTION).intervalDays();
        int easy = FsrsEngine.review(mature, 4, 30.0, NOW, RETENTION).intervalDays();

        assertThat(easy).isGreaterThan(good);
    }

    @Test
    @DisplayName("Difficulty luôn nằm trong [1, 10] qua chuỗi chấm ngẫu nhiên dài")
    void difficultyStaysWithinBounds() {
        Random random = new Random(20260907L);
        FsrsState state = FsrsState.newCard();
        double elapsed = 0;

        for (int i = 0; i < 5000; i++) {
            int grade = 1 + random.nextInt(4);
            FsrsResult result = FsrsEngine.review(state, grade, elapsed, NOW, RETENTION);
            state = result.next();

            assertThat(state.difficulty()).isBetween(1.0, 10.0);
            assertThat(state.stability()).isGreaterThan(0.0);
            assertThat(result.intervalDays()).isBetween(0, 36500);

            elapsed = result.intervalDays() > 0 ? result.intervalDays() : 10.0 / 1440.0;
        }

        // Chấm Again liên tục phải đẩy D lên sát trần nhưng không vượt.
        FsrsState hardest = FsrsState.newCard();
        for (int i = 0; i < 200; i++) {
            hardest = FsrsEngine.review(hardest, 1, 1.0, NOW, RETENTION).next();
        }
        assertThat(hardest.difficulty()).isLessThanOrEqualTo(10.0).isGreaterThan(9.0);

        // Chấm Easy liên tục phải kéo D xuống sát sàn nhưng không thủng.
        FsrsState easiest = FsrsState.newCard();
        for (int i = 0; i < 200; i++) {
            easiest = FsrsEngine.review(easiest, 4, 1.0, NOW, RETENTION).next();
        }
        assertThat(easiest.difficulty()).isGreaterThanOrEqualTo(1.0).isLessThan(2.0);
    }

    @Test
    @DisplayName("Mapping điểm nét viết sang grade đúng các ngưỡng 48/70/88")
    void gradeFromScoreThresholds() {
        assertThat(FsrsEngine.gradeFromScore(0, false)).isEqualTo(1);
        assertThat(FsrsEngine.gradeFromScore(47, false)).isEqualTo(1);
        assertThat(FsrsEngine.gradeFromScore(48, false)).isEqualTo(2);
        assertThat(FsrsEngine.gradeFromScore(69, false)).isEqualTo(2);
        assertThat(FsrsEngine.gradeFromScore(70, false)).isEqualTo(3);
        assertThat(FsrsEngine.gradeFromScore(87, false)).isEqualTo(3);
        assertThat(FsrsEngine.gradeFromScore(88, false)).isEqualTo(4);
        assertThat(FsrsEngine.gradeFromScore(100, false)).isEqualTo(4);

        // Một nét hỏng là đủ để coi như quên, bất kể điểm trung bình.
        assertThat(FsrsEngine.gradeFromScore(100, true)).isEqualTo(1);
        assertThat(FsrsEngine.gradeFromScore(95, true)).isEqualTo(1);
    }

    @Test
    @DisplayName("Khoảng cách ôn nhất quán với định nghĩa của stability")
    void intervalMatchesStabilityDefinition() {
        // Với mức nhớ mục tiêu 90%, khoảng cách đúng bằng stability theo định nghĩa của FSRS.
        assertThat(FsrsEngine.intervalDays(10.0, 0.90)).isEqualTo(10);
        assertThat(FsrsEngine.intervalDays(45.0, 0.90)).isEqualTo(45);

        // Muốn nhớ chắc hơn thì phải ôn dày hơn.
        assertThat(FsrsEngine.intervalDays(30.0, 0.95)).isLessThan(FsrsEngine.intervalDays(30.0, 0.90));
        // Khoảng cách tối thiểu là 1 ngày, kể cả khi stability rất nhỏ.
        assertThat(FsrsEngine.intervalDays(0.001, 0.90)).isEqualTo(1);
        assertThat(FsrsEngine.intervalDays(1e9, 0.90)).isEqualTo(36500);
    }

    @Test
    @DisplayName("Grade ngoài khoảng 1..4 bị từ chối")
    void invalidGradeRejected() {
        assertThatThrownBy(() -> FsrsEngine.review(FsrsState.newCard(), 0, 0, NOW, RETENTION))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> FsrsEngine.review(FsrsState.newCard(), 5, 0, NOW, RETENTION))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Thẻ RELEARNING quay lại REVIEW sau khi trả lời Good ở mốc cuối")
    void relearningGraduatesBack() {
        FsrsState relearning = new FsrsState(2.5, 6.0, CardState.RELEARNING, 0, 6, 1);

        FsrsResult result = FsrsEngine.review(relearning, 3, 10.0 / 1440.0, NOW, RETENTION);

        assertThat(result.next().state()).isEqualTo(CardState.REVIEW);
        assertThat(result.intervalDays()).isGreaterThanOrEqualTo(1);
        // Trả lời đúng trong lúc học lại không được tính thêm lapse.
        assertThat(result.next().lapses()).isEqualTo(1);

        FsrsResult againAgain = FsrsEngine.review(relearning, 1, 10.0 / 1440.0, NOW, RETENTION);
        assertThat(againAgain.next().state()).isEqualTo(CardState.RELEARNING);
        assertThat(againAgain.next().lapses()).isEqualTo(1);
    }
}
