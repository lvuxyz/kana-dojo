package com.japanese.learning.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "leaderboard_snapshots",
        uniqueConstraints = @UniqueConstraint(name = "uq_leaderboard_snapshots",
                columnNames = {"week_start", "user_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaderboardSnapshot extends BaseEntity {

    @Column(name = "week_start", nullable = false)
    private LocalDate weekStart;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "xp", nullable = false)
    private int xp;

    @Column(name = "rank", nullable = false)
    private int rank;
}
