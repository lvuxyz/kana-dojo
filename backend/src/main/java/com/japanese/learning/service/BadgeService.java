package com.japanese.learning.service;

import com.japanese.learning.domain.entity.Badge;
import com.japanese.learning.domain.entity.User;
import com.japanese.learning.domain.entity.UserBadge;
import com.japanese.learning.domain.entity.UserStats;
import com.japanese.learning.domain.entity.WritingAttempt;
import com.japanese.learning.domain.enums.BadgeEvent;
import com.japanese.learning.domain.enums.CardState;
import com.japanese.learning.domain.enums.ItemType;
import com.japanese.learning.domain.enums.KanaGroup;
import com.japanese.learning.domain.enums.Script;
import com.japanese.learning.repository.BadgeRepository;
import com.japanese.learning.repository.KanaCharacterRepository;
import com.japanese.learning.repository.ReviewCardRepository;
import com.japanese.learning.repository.UserBadgeRepository;
import com.japanese.learning.repository.UserRepository;
import com.japanese.learning.repository.UserStatsRepository;
import com.japanese.learning.repository.WritingAttemptRepository;
import com.japanese.learning.web.dto.GamificationDtos.BadgeDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Xét huy hiệu sau mỗi lần ghi nhận hoạt động.
 *
 * <p>Chỉ chạy những phép kiểm tra mà sự kiện vừa xảy ra có thể làm thay đổi kết quả,
 * nhờ đó mỗi lần chấm thẻ không kéo theo cả chục truy vấn tổng hợp.
 * Việc trao huy hiệu là idempotent: ràng buộc UNIQUE(user_id, badge_id) là chốt chặn cuối.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BadgeService {

    public static final String FIRST_STROKE = "FIRST_STROKE";
    public static final String HIRAGANA_MASTER = "HIRAGANA_MASTER";
    public static final String KATAKANA_MASTER = "KATAKANA_MASTER";
    public static final String STREAK_7 = "STREAK_7";
    public static final String STREAK_30 = "STREAK_30";
    public static final String STREAK_100 = "STREAK_100";
    public static final String PERFECT_10 = "PERFECT_10";
    public static final String NIGHT_OWL = "NIGHT_OWL";
    public static final String REVIEW_1000 = "REVIEW_1000";

    private static final int PERFECT_STREAK_LENGTH = 10;
    private static final int PERFECT_MIN_SCORE = 95;
    private static final int NIGHT_OWL_HOUR = 23;
    private static final long REVIEW_MILESTONE = 1000L;

    private final BadgeRepository badgeRepository;
    private final UserBadgeRepository userBadgeRepository;
    private final UserRepository userRepository;
    private final UserStatsRepository userStatsRepository;
    private final WritingAttemptRepository writingAttemptRepository;
    private final ReviewCardRepository reviewCardRepository;
    private final KanaCharacterRepository kanaCharacterRepository;

    /**
     * Xét toàn bộ điều kiện liên quan tới sự kiện và trả về mã các huy hiệu vừa đạt được.
     * Danh sách rỗng là trường hợp thường gặp nhất và không tốn thao tác ghi nào.
     */
    @Transactional
    public List<String> evaluate(Long userId, BadgeEvent event) {
        Optional<User> maybeUser = userRepository.findById(userId);
        if (maybeUser.isEmpty()) {
            return List.of();
        }
        User user = maybeUser.get();
        UserStats stats = userStatsRepository.findByUserId(userId)
                .orElseGet(() -> UserStats.builder().userId(userId).build());

        List<String> candidates = new ArrayList<>();

        if (event == BadgeEvent.WRITING_ATTEMPT) {
            if (writingAttemptRepository.existsByUserIdAndPassedTrue(userId)) {
                candidates.add(FIRST_STROKE);
            }
            if (hasPerfectStreak(userId)) {
                candidates.add(PERFECT_10);
            }
        }

        if (event == BadgeEvent.WRITING_ATTEMPT || event == BadgeEvent.REVIEW_GRADED) {
            if (hasMasteredBasicScript(userId, Script.HIRAGANA)) {
                candidates.add(HIRAGANA_MASTER);
            }
            if (hasMasteredBasicScript(userId, Script.KATAKANA)) {
                candidates.add(KATAKANA_MASTER);
            }
            if (stats.getTotalReviews() >= REVIEW_MILESTONE) {
                candidates.add(REVIEW_1000);
            }
        }

        // "Cú đêm" phụ thuộc giờ địa phương của chính người học, không phải giờ máy chủ.
        if (isNightOwlMoment(user.zoneId())) {
            candidates.add(NIGHT_OWL);
        }

        int streak = stats.getCurrentStreak();
        if (streak >= 7) {
            candidates.add(STREAK_7);
        }
        if (streak >= 30) {
            candidates.add(STREAK_30);
        }
        if (streak >= 100) {
            candidates.add(STREAK_100);
        }

        List<String> awarded = new ArrayList<>();
        for (String code : candidates) {
            if (award(userId, code)) {
                awarded.add(code);
            }
        }
        return awarded;
    }

    /** Danh sách toàn bộ huy hiệu kèm thời điểm người dùng đạt được (null nếu chưa đạt). */
    @Transactional(readOnly = true)
    public List<BadgeDto> listFor(Long userId) {
        Map<Long, Instant> earned = new HashMap<>();
        for (UserBadge userBadge : userBadgeRepository.findByUserId(userId)) {
            earned.put(userBadge.getBadgeId(), userBadge.getEarnedAt());
        }
        return badgeRepository.findAllByOrderBySortOrderAsc().stream()
                .map(badge -> new BadgeDto(
                        badge.getId(),
                        badge.getCode(),
                        badge.getNameVi(),
                        badge.getDescriptionVi(),
                        badge.getIcon(),
                        badge.getTier(),
                        badge.getSortOrder(),
                        earned.get(badge.getId())))
                .toList();
    }

    private boolean award(Long userId, String code) {
        Optional<Badge> badge = badgeRepository.findByCode(code);
        if (badge.isEmpty()) {
            log.warn("Huy hiệu {} chưa được seed trong CSDL", code);
            return false;
        }
        Long badgeId = badge.get().getId();
        if (userBadgeRepository.existsByUserIdAndBadgeId(userId, badgeId)) {
            return false;
        }
        try {
            userBadgeRepository.save(UserBadge.builder()
                    .userId(userId)
                    .badgeId(badgeId)
                    .earnedAt(Instant.now())
                    .build());
            return true;
        } catch (DataIntegrityViolationException ex) {
            // Hai request song song cùng trao một huy hiệu: người thua cuộc coi như không có gì mới.
            return false;
        }
    }

    /** Thuộc đủ 46 ký tự cơ bản của một bảng chữ: mọi thẻ viết đều đã tốt nghiệp sang REVIEW. */
    private boolean hasMasteredBasicScript(Long userId, Script script) {
        long total = kanaCharacterRepository.countByScriptAndKanaGroup(script, KanaGroup.BASIC);
        if (total == 0) {
            return false;
        }
        long mastered = reviewCardRepository.countMasteredKana(
                userId, ItemType.KANA_WRITING, CardState.REVIEW, script, KanaGroup.BASIC);
        return mastered >= total;
    }

    /** 10 lần viết gần nhất đều từ 95 điểm trở lên và phải đủ 10 lần. */
    private boolean hasPerfectStreak(Long userId) {
        List<WritingAttempt> recent = writingAttemptRepository.findTop10ByUserIdOrderByCreatedAtDesc(userId);
        if (recent.size() < PERFECT_STREAK_LENGTH) {
            return false;
        }
        return recent.stream().allMatch(attempt -> attempt.getAvgScore() >= PERFECT_MIN_SCORE);
    }

    private boolean isNightOwlMoment(ZoneId zone) {
        return Instant.now().atZone(zone).getHour() >= NIGHT_OWL_HOUR;
    }
}
