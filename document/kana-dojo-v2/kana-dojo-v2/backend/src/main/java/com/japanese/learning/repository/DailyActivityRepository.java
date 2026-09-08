package com.japanese.learning.repository;

import com.japanese.learning.domain.entity.DailyActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DailyActivityRepository extends JpaRepository<DailyActivity, Long> {

    Optional<DailyActivity> findByUserIdAndActivityDate(Long userId, LocalDate activityDate);

    List<DailyActivity> findByUserIdAndActivityDateBetweenOrderByActivityDateAsc(
            Long userId, LocalDate from, LocalDate to);

    /**
     * Bảng xếp hạng trong tuần đang chạy, tính trực tiếp từ hoạt động ngày.
     * Bí danh cột được trích dẫn để PostgreSQL giữ nguyên chữ hoa cho projection.
     */
    @Query(value = """
            select da.user_id      as "userId",
                   u.display_name  as "displayName",
                   u.avatar_url    as "avatarUrl",
                   sum(da.xp_earned) as "xp"
            from daily_activity da
            join users u on u.id = da.user_id
            where da.activity_date between :from and :to
              and u.status = 'ACTIVE'
            group by da.user_id, u.display_name, u.avatar_url
            having sum(da.xp_earned) > 0
            order by sum(da.xp_earned) desc, da.user_id asc
            limit :maxRows
            """, nativeQuery = true)
    List<LeaderboardRow> findLeaderboard(@Param("from") LocalDate from,
                                         @Param("to") LocalDate to,
                                         @Param("maxRows") int maxRows);

    @Query(value = """
            select coalesce(sum(da.xp_earned), 0)
            from daily_activity da
            where da.user_id = :userId and da.activity_date between :from and :to
            """, nativeQuery = true)
    long sumXpForUser(@Param("userId") Long userId,
                      @Param("from") LocalDate from,
                      @Param("to") LocalDate to);

    /** Thứ hạng = số người có tổng XP cao hơn, cộng một. */
    @Query(value = """
            select count(*) + 1
            from (
                select da.user_id, sum(da.xp_earned) as total
                from daily_activity da
                join users u on u.id = da.user_id
                where da.activity_date between :from and :to and u.status = 'ACTIVE'
                group by da.user_id
            ) ranked
            where ranked.total > :xp
            """, nativeQuery = true)
    long rankForXp(@Param("from") LocalDate from,
                   @Param("to") LocalDate to,
                   @Param("xp") long xp);

    /** Dòng kết quả của bảng xếp hạng, ánh xạ theo bí danh cột. */
    interface LeaderboardRow {
        Long getUserId();

        String getDisplayName();

        String getAvatarUrl();

        Long getXp();
    }
}
