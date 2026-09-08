package com.japanese.learning.repository;

import com.japanese.learning.domain.entity.PlanFeature;
import com.japanese.learning.domain.enums.PlanCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlanFeatureRepository extends JpaRepository<PlanFeature, Long> {

    List<PlanFeature> findByPlan(PlanCode plan);

    Optional<PlanFeature> findByPlanAndFeatureKey(PlanCode plan, String featureKey);
}
