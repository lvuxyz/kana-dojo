package com.japanese.learning.repository;

import com.japanese.learning.domain.entity.Badge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BadgeRepository extends JpaRepository<Badge, Long> {

    List<Badge> findAllByOrderBySortOrderAsc();

    Optional<Badge> findByCode(String code);
}
