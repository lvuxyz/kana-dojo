package com.japanese.learning.service;

import com.japanese.learning.common.LocalDay;
import com.japanese.learning.config.AppProperties;
import com.japanese.learning.domain.entity.DailyActivity;
import com.japanese.learning.domain.entity.User;
import com.japanese.learning.domain.entity.UserStats;
import com.japanese.learning.repository.DailyActivityRepository;
import com.japanese.learning.repository.UserStatsRepository;
import com.japanese.learning.web.dto.GamificationDtos.HeatmapEntryDto;
import com.japanese.learning.web.dto.GamificationDtos.StatsDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * XP, cấp độ, streak và tổng hợp hoạt động theo ngày.
 *
 * <p>Điểm then chốt: <b>mọi phép tính ngày đều theo múi giờ của người học</b>
 * ({@code users.timezone}), không phải UTC. Người học ở Việt Nam kết thúc ngày lúc
 * 00:00 giờ VN; nếu dùng UTC thì streak sẽ đứt lúc 7 giờ sáng và mục tiêu ngày
 * bị reset giữa buổi học.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GamificationService {

    public static final int XP_REVIEW_CORRECT = 10;
    public static final int XP_REVIEW_WRONG = 3;
    public static final int XP_WRITING_FIRST_PASS = 25;
    public static final int XP_QUIZ_BASE = 20;
    public static final int XP_QUIZ_PER_CORRECT = 5;
    public static final int XP_DAILY_GOAL_BONUS = 50;
    public static final int XP_TYPING_BASE = 5;
    public static final int XP_TYPING_KEYS_PER_POINT = 10;
    public static final int XP_TYPING_MAX = 50;
    public static final int TYPING_MIN_KEYS_FOR_XP = 20;

    private final UserStatsRepository userStatsRepository;
    private final DailyActivityRepository dailyActivityRepository;
    private final AppProperties properties;

    /** Lượng hoạt động cần ghi nhận của một thao tác học. */
    public record ActivityDelta(int xp, int reviewsDone, int charsWritten, int studyMs, int writingMs) {

        public static ActivityDelta review(int xp, int durationMs) {
            return new ActivityDelta(xp, 1, 0, Math.max(durationMs, 0), 0);
        }

        public static ActivityDelta writing(int xp, int durationMs) {
            return new ActivityDelta(xp, 1, 1, Math.max(durationMs, 0), Math.max(durationMs, 0));
        }

        public static ActivityDelta quiz(int xp, int durationMs) {
            return new ActivityDelta(xp, 0, 0, Math.max(durationMs, 0), 0);
        }

        public static ActivityDelta typing(int xp, int durationMs) {
            return new ActivityDelta(xp, 0, 0, Math.max(durationMs, 0), 0);
        }
    }

    /** Kết quả ghi nhận: tổng XP thực nhận (đã gồm thưởng) và streak sau khi cập nhật. */
    public record ActivityOutcome(int xpAwarded, boolean goalMetNow, int currentStreak, int level) {
    }

    /** XP cho một lượt ôn: trả lời sai vẫn được thưởng để không phạt hành vi học. */
    public static int reviewXp(int grade) {
        return grade >= 2 ? XP_REVIEW_CORRECT : XP_REVIEW_WRONG;
    }

    public static int quizXp(int correctCount) {
        return XP_QUIZ_BASE + correctCount * XP_QUIZ_PER_CORRECT;
    }

    /**
     * XP cho một lượt luyện gõ: tỉ lệ với số phím đúng (5 + 1 XP mỗi 10 phím, tối đa 50) để chia nhỏ
     * lượt gõ không cày được thêm XP. Dưới 20 phím đúng thì chưa tính là một lượt luyện.
     */
    public static int typingXp(int correctKeys) {
        if (correctKeys < TYPING_MIN_KEYS_FOR_XP) {
            return 0;
        }
        return Math.min(XP_TYPING_MAX, XP_TYPING_BASE + correctKeys / XP_TYPING_KEYS_PER_POINT);
    }

    public static int levelFor(long xpTotal) {
        return (int) Math.floor(Math.sqrt(Math.max(xpTotal, 0) / 100.0)) + 1;
    }

    /** XP còn thiếu để lên cấp kế tiếp; mốc của cấp L là 100 * (L-1)^2. */
    public static long xpToNextLevel(long xpTotal) {
        int level = levelFor(xpTotal);
        long threshold = 100L * level * level;
        return Math.max(threshold - xpTotal, 0);
    }

    @Transactional
    public UserStats statsFor(Long userId) {
        return userStatsRepository.findByUserId(userId)
                .orElseGet(() -> userStatsRepository.save(UserStats.builder().userId(userId).build()));
    }

    /**
     * Cộng XP, cập nhật tổng hợp ngày và streak trong cùng một giao dịch với thao tác gọi nó.
     * Chỉ khi vượt mục tiêu XP ngày thì streak mới tăng — mở app không tính.
     */
    @Transactional
    public ActivityOutcome recordActivity(User user, ActivityDelta delta) {
        ZoneId zone = user.zoneId();
        LocalDay today = LocalDay.today(zone);

        DailyActivity activity = dailyActivityRepository
                .findByUserIdAndActivityDate(user.getId(), today.date())
                .orElseGet(() -> DailyActivity.builder()
                        .userId(user.getId())
                        .activityDate(today.date())
                        .build());

        activity.setXpEarned(activity.getXpEarned() + delta.xp());
        activity.setReviewsDone(activity.getReviewsDone() + delta.reviewsDone());
        activity.setCharsWritten(activity.getCharsWritten() + delta.charsWritten());
        activity.setStudyMs(activity.getStudyMs() + delta.studyMs());

        UserStats stats = statsFor(user.getId());
        int xpAwarded = delta.xp();
        boolean goalMetNow = false;

        int goal = user.getDailyGoalXp() == null ? 50 : user.getDailyGoalXp();
        if (!activity.isGoalMet() && activity.getXpEarned() >= goal) {
            goalMetNow = true;
            activity.setGoalMet(true);
            activity.setXpEarned(activity.getXpEarned() + XP_DAILY_GOAL_BONUS);
            xpAwarded += XP_DAILY_GOAL_BONUS;
            advanceStreak(stats, today.date());
        }

        stats.setXpTotal(stats.getXpTotal() + xpAwarded);
        stats.setLevel(levelFor(stats.getXpTotal()));
        stats.setTotalReviews(stats.getTotalReviews() + delta.reviewsDone());
        stats.setTotalWritingMs(stats.getTotalWritingMs() + delta.writingMs());

        dailyActivityRepository.save(activity);
        userStatsRepository.save(stats);

        return new ActivityOutcome(xpAwarded, goalMetNow, stats.getCurrentStreak(), stats.getLevel());
    }

    /**
     * Luật streak theo ngày địa phương:
     * <ul>
     *   <li>cùng ngày → giữ nguyên;</li>
     *   <li>đúng ngày kế tiếp → +1;</li>
     *   <li>hở đúng một ngày và còn thẻ băng → tiêu một thẻ, streak vẫn +1;</li>
     *   <li>các trường hợp còn lại → đặt lại về 1.</li>
     * </ul>
     */
    private void advanceStreak(UserStats stats, LocalDate today) {
        LocalDate last = stats.getLastActiveDate();
        if (last == null) {
            stats.setCurrentStreak(1);
        } else if (last.equals(today)) {
            // Đã tính cho hôm nay rồi, không cộng thêm lần nữa.
            return;
        } else if (last.plusDays(1).equals(today)) {
            stats.setCurrentStreak(stats.getCurrentStreak() + 1);
        } else {
            long gapDays = ChronoUnit.DAYS.between(last, today);
            if (gapDays == 2 && stats.getStreakFreezes() > 0) {
                stats.setStreakFreezes((short) (stats.getStreakFreezes() - 1));
                stats.setCurrentStreak(stats.getCurrentStreak() + 1);
            } else {
                stats.setCurrentStreak(1);
            }
        }
        stats.setLastActiveDate(today);
        stats.setLongestStreak(Math.max(stats.getLongestStreak(), stats.getCurrentStreak()));
    }

    @Transactional(readOnly = true)
    public StatsDto statsDtoFor(User user) {
        UserStats stats = userStatsRepository.findByUserId(user.getId())
                .orElseGet(() -> UserStats.builder().userId(user.getId()).build());
        LocalDay today = LocalDay.today(user.zoneId());
        DailyActivity activity = dailyActivityRepository
                .findByUserIdAndActivityDate(user.getId(), today.date())
                .orElse(null);

        int goal = user.getDailyGoalXp() == null ? 50 : user.getDailyGoalXp();
        return new StatsDto(
                stats.getXpTotal(),
                stats.getLevel(),
                xpToNextLevel(stats.getXpTotal()),
                stats.getCurrentStreak(),
                stats.getLongestStreak(),
                stats.getStreakFreezes(),
                activity == null ? 0 : activity.getXpEarned(),
                goal,
                activity != null && activity.isGoalMet());
    }

    /** Heatmap theo ngày địa phương; số ngày bị giới hạn bởi hạn mức gói ở tầng gọi. */
    @Transactional(readOnly = true)
    public List<HeatmapEntryDto> heatmap(User user, int days) {
        LocalDate today = LocalDay.today(user.zoneId()).date();
        LocalDate from = today.minusDays(Math.max(days, 1) - 1L);
        return dailyActivityRepository
                .findByUserIdAndActivityDateBetweenOrderByActivityDateAsc(user.getId(), from, today)
                .stream()
                .map(a -> new HeatmapEntryDto(a.getActivityDate(), a.getXpEarned(), a.getReviewsDone()))
                .toList();
    }

    /** Hồi thẻ băng về tối đa vào 00:00 thứ Hai giờ Việt Nam. */
    @Scheduled(cron = "0 0 0 * * MON", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void refillStreakFreezes() {
        short max = (short) properties.gamification().maxStreakFreezes();
        int updated = userStatsRepository.refillStreakFreezes(max);
        log.info("Hồi thẻ băng streak về {} cho {} tài khoản", max, updated);
    }

    /** Dùng cho các luồng cần biết mốc thời gian nhất quán với ngày địa phương. */
    public LocalDay todayFor(User user) {
        return LocalDay.of(user.zoneId(), Instant.now());
    }
}
