package com.japanese.learning.service;

import com.japanese.learning.domain.entity.LeaderboardSnapshot;
import com.japanese.learning.repository.DailyActivityRepository;
import com.japanese.learning.repository.DailyActivityRepository.LeaderboardRow;
import com.japanese.learning.repository.LeaderboardSnapshotRepository;
import com.japanese.learning.repository.UserRepository;
import com.japanese.learning.web.dto.GamificationDtos.LeaderboardDto;
import com.japanese.learning.web.dto.GamificationDtos.LeaderboardEntryDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;

/**
 * Bảng xếp hạng tuần. Tuần bắt đầu 00:00 thứ Hai giờ Việt Nam cho tất cả người dùng —
 * dùng múi giờ riêng từng người sẽ khiến hai người không bao giờ so được với nhau.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LeaderboardService {

    /** Múi giờ chuẩn của giải đấu, cố định cho mọi người chơi. */
    public static final ZoneId LEAGUE_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    /** Số dòng tối đa lưu vào ảnh chụp tuần. */
    private static final int SNAPSHOT_SIZE = 1000;

    private final DailyActivityRepository dailyActivityRepository;
    private final LeaderboardSnapshotRepository leaderboardSnapshotRepository;
    private final UserRepository userRepository;

    public static LocalDate currentWeekStart() {
        return LocalDate.now(LEAGUE_ZONE).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    /** Bảng xếp hạng của tuần đang chạy, tính trực tiếp từ daily_activity. */
    @Transactional(readOnly = true)
    public LeaderboardDto weekly(Long currentUserId, int limit) {
        LocalDate weekStart = currentWeekStart();
        LocalDate today = LocalDate.now(LEAGUE_ZONE);
        int size = Math.min(Math.max(limit, 1), 200);

        List<LeaderboardRow> rows = dailyActivityRepository.findLeaderboard(weekStart, today, size);
        List<LeaderboardEntryDto> entries = new ArrayList<>(rows.size());
        Integer myRank = null;

        for (int i = 0; i < rows.size(); i++) {
            LeaderboardRow row = rows.get(i);
            int rank = i + 1;
            long xp = row.getXp() == null ? 0L : row.getXp();
            entries.add(new LeaderboardEntryDto(rank, row.getUserId(), row.getDisplayName(), row.getAvatarUrl(), xp));
            if (row.getUserId().equals(currentUserId)) {
                myRank = rank;
            }
        }

        if (myRank == null) {
            // Người dùng nằm ngoài top: tính hạng bằng cách đếm số người có XP cao hơn.
            long myXp = dailyActivityRepository.sumXpForUser(currentUserId, weekStart, today);
            myRank = myXp > 0 ? (int) dailyActivityRepository.rankForXp(weekStart, today, myXp) : null;
        }

        return new LeaderboardDto(weekStart, myRank, entries);
    }

    /**
     * Chốt bảng xếp hạng tuần trước vào 00:05 thứ Hai giờ Việt Nam.
     * Chạy sau nửa đêm 5 phút để mọi giao dịch của phút cuối tuần đã kịp ghi.
     */
    @Scheduled(cron = "0 5 0 * * MON", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void snapshotPreviousWeek() {
        LocalDate weekStart = currentWeekStart().minusWeeks(1);
        int saved = snapshotWeek(weekStart);
        log.info("Đã chốt bảng xếp hạng tuần {} với {} dòng", weekStart, saved);
    }

    /** Chốt một tuần cụ thể; ghi đè ảnh chụp cũ nếu chạy lại. */
    @Transactional
    public int snapshotWeek(LocalDate weekStart) {
        LocalDate weekEnd = weekStart.plusDays(6);
        List<LeaderboardRow> rows = dailyActivityRepository.findLeaderboard(weekStart, weekEnd, SNAPSHOT_SIZE);

        leaderboardSnapshotRepository.deleteByWeekStart(weekStart);
        List<LeaderboardSnapshot> snapshots = new ArrayList<>(rows.size());
        for (int i = 0; i < rows.size(); i++) {
            LeaderboardRow row = rows.get(i);
            snapshots.add(LeaderboardSnapshot.builder()
                    .weekStart(weekStart)
                    .userId(row.getUserId())
                    .xp(row.getXp() == null ? 0 : row.getXp().intValue())
                    .rank(i + 1)
                    .build());
        }
        leaderboardSnapshotRepository.saveAll(snapshots);
        return snapshots.size();
    }

    /** Bảng xếp hạng đã chốt của một tuần trong quá khứ. */
    @Transactional(readOnly = true)
    public LeaderboardDto archived(LocalDate weekStart, Long currentUserId) {
        List<LeaderboardSnapshot> snapshots = leaderboardSnapshotRepository.findByWeekStartOrderByRankAsc(weekStart);
        List<LeaderboardEntryDto> entries = snapshots.stream()
                .map(snapshot -> userRepository.findById(snapshot.getUserId())
                        .map(user -> new LeaderboardEntryDto(snapshot.getRank(), user.getId(),
                                user.getDisplayName(), user.getAvatarUrl(), snapshot.getXp()))
                        .orElse(new LeaderboardEntryDto(snapshot.getRank(), snapshot.getUserId(),
                                "Người dùng đã xoá", null, snapshot.getXp())))
                .toList();
        Integer myRank = leaderboardSnapshotRepository.findByWeekStartAndUserId(weekStart, currentUserId)
                .map(LeaderboardSnapshot::getRank)
                .orElse(null);
        return new LeaderboardDto(weekStart, myRank, entries);
    }
}
