package com.japanese.learning.repository;

import com.japanese.learning.domain.entity.LeaderboardSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface LeaderboardSnapshotRepository extends JpaRepository<LeaderboardSnapshot, Long> {

    List<LeaderboardSnapshot> findByWeekStartOrderByRankAsc(LocalDate weekStart);

    Optional<LeaderboardSnapshot> findByWeekStartAndUserId(LocalDate weekStart, Long userId);

    void deleteByWeekStart(LocalDate weekStart);
}
