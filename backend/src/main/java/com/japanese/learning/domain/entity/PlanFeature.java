package com.japanese.learning.domain.entity;

import com.japanese.learning.domain.enums.PlanCode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Hạn mức của một tính năng theo gói cước; limit_value NULL nghĩa là không giới hạn. */
@Entity
@Table(name = "plan_features")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlanFeature extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "plan", nullable = false, length = 16)
    private PlanCode plan;

    @Column(name = "feature_key", nullable = false, length = 48)
    private String featureKey;

    @Column(name = "limit_value")
    private Integer limitValue;
}
