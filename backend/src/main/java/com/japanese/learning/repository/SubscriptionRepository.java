package com.japanese.learning.repository;

import com.japanese.learning.domain.entity.Subscription;
import com.japanese.learning.domain.enums.SubscriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {

    Optional<Subscription> findFirstByUserIdAndStatusOrderByIdDesc(Long userId, SubscriptionStatus status);

    List<Subscription> findByUserIdOrderByIdDesc(Long userId);
}
