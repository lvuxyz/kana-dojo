package com.japanese.learning.repository;

import com.japanese.learning.domain.entity.ReviewLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface ReviewLogRepository extends JpaRepository<ReviewLog, Long> {

    @Query("select count(l) from ReviewLog l where l.userId = :userId and l.reviewedAt >= :from and l.reviewedAt < :to")
    long countBetween(@Param("userId") Long userId, @Param("from") Instant from, @Param("to") Instant to);
}
