// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.service;
//
// import com.japanese.learning.common.LocalDay;
// import com.japanese.learning.common.QuotaExceededException;
// import com.japanese.learning.domain.entity.PlanFeature;
// import com.japanese.learning.domain.entity.User;
// import com.japanese.learning.domain.enums.PlanCode;
// import com.japanese.learning.repository.PlanFeatureRepository;
// import com.japanese.learning.repository.ReviewLogRepository;
// import com.japanese.learning.repository.WritingAttemptRepository;
// import com.japanese.learning.web.dto.EntitlementDtos.EntitlementsDto;
// import lombok.RequiredArgsConstructor;
// import org.springframework.stereotype.Service;
// import org.springframework.transaction.annotation.Transactional;
//
// import java.util.HashMap;
// import java.util.LinkedHashMap;
// import java.util.Map;
// import java.util.Optional;
//
// /**
//  * Hạn mức theo gói cước. Nguồn duy nhất là bảng {@code plan_features} nên đổi hạn mức
//  * chỉ cần một câu UPDATE, không phải phát hành lại ứng dụng.
//  */
// @Service
// @RequiredArgsConstructor
// public class EntitlementService {
//
//     public static final String FEATURE_DAILY_REVIEWS = "srs.daily_reviews";
//     public static final String FEATURE_DAILY_WRITING = "writing.daily_attempts";
//     public static final String FEATURE_JLPT_LEVELS = "content.jlpt_levels";
//     public static final String FEATURE_HISTORY_DAYS = "stats.history_days";
//
//     /** Dùng khi hạn mức là NULL (không giới hạn) nhưng chỗ gọi cần một con số. */
//     private static final int UNLIMITED_DAYS = 36500;
//
//     private final PlanFeatureRepository planFeatureRepository;
//     private final ReviewLogRepository reviewLogRepository;
//     private final WritingAttemptRepository writingAttemptRepository;
//
//     /** Bản đồ hạn mức của một gói; giá trị null nghĩa là không giới hạn. */
//     @Transactional(readOnly = true)
//     public Map<String, Integer> featuresFor(PlanCode plan) {
//         Map<String, Integer> features = new LinkedHashMap<>();
//         for (PlanFeature feature : planFeatureRepository.findByPlan(plan)) {
//             features.put(feature.getFeatureKey(), feature.getLimitValue());
//         }
//         return features;
//     }
//
//     @Transactional(readOnly = true)
//     public EntitlementsDto entitlementsOf(User user) {
//         return new EntitlementsDto(user.getPlan(), featuresFor(user.getPlan()), usageOf(user));
//     }
//
//     /** Mức đã dùng trong ngày địa phương hiện tại của người học. */
//     @Transactional(readOnly = true)
//     public Map<String, Long> usageOf(User user) {
//         LocalDay today = LocalDay.today(user.zoneId());
//         Map<String, Long> usage = new HashMap<>();
//         usage.put(FEATURE_DAILY_REVIEWS,
//                 reviewLogRepository.countBetween(user.getId(), today.start(), today.endExclusive()));
//         usage.put(FEATURE_DAILY_WRITING,
//                 writingAttemptRepository.countBetween(user.getId(), today.start(), today.endExclusive()));
//         return usage;
//     }
//
//     /**
//      * Chặn trước khi thực hiện hành động tính phí hạn mức.
//      * Ném {@link QuotaExceededException} (HTTP 429) kèm tên tính năng bị chặn.
//      */
//     @Transactional(readOnly = true)
//     public void ensureWithinQuota(User user, String featureKey) {
//         Integer limit = limitOf(user.getPlan(), featureKey);
//         if (limit == null) {
//             return;
//         }
//         LocalDay today = LocalDay.today(user.zoneId());
//         long used = switch (featureKey) {
//             case FEATURE_DAILY_REVIEWS ->
//                     reviewLogRepository.countBetween(user.getId(), today.start(), today.endExclusive());
//             case FEATURE_DAILY_WRITING ->
//                     writingAttemptRepository.countBetween(user.getId(), today.start(), today.endExclusive());
//             default -> 0L;
//         };
//         if (used >= limit) {
//             throw new QuotaExceededException(featureKey, limit, describe(featureKey, limit));
//         }
//     }
//
//     /**
//      * Cấp JLPT thấp nhất (theo số) mà gói được xem: FREE = 5 nghĩa là chỉ N5,
//      * PRO = 1 nghĩa là xem được tới N1.
//      */
//     @Transactional(readOnly = true)
//     public int minJlptLevel(PlanCode plan) {
//         Integer limit = limitOf(plan, FEATURE_JLPT_LEVELS);
//         return limit == null ? 1 : limit;
//     }
//
//     /** Số ngày lịch sử thống kê được phép xem. */
//     @Transactional(readOnly = true)
//     public int historyDays(PlanCode plan) {
//         Integer limit = limitOf(plan, FEATURE_HISTORY_DAYS);
//         return limit == null ? UNLIMITED_DAYS : limit;
//     }
//
//     private Integer limitOf(PlanCode plan, String featureKey) {
//         Optional<PlanFeature> feature = planFeatureRepository.findByPlanAndFeatureKey(plan, featureKey);
//         // Không có dòng cấu hình nào nghĩa là tính năng chưa bị giới hạn.
//         return feature.map(PlanFeature::getLimitValue).orElse(null);
//     }
//
//     private String describe(String featureKey, int limit) {
//         return switch (featureKey) {
//             case FEATURE_DAILY_REVIEWS ->
//                     "Bạn đã đạt hạn mức " + limit + " lượt ôn mỗi ngày của gói miễn phí. Nâng cấp lên PRO để ôn không giới hạn.";
//             case FEATURE_DAILY_WRITING ->
//                     "Bạn đã đạt hạn mức " + limit + " lượt luyện viết mỗi ngày của gói miễn phí. Nâng cấp lên PRO để luyện không giới hạn.";
//             default -> "Bạn đã đạt hạn mức " + limit + " của tính năng " + featureKey + " trong gói hiện tại.";
//         };
//     }
// }
