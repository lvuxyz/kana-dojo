package com.japanese.learning.service;

import com.japanese.learning.common.ApiException;
import com.japanese.learning.common.LocalDay;
import com.japanese.learning.config.AppProperties;
import com.japanese.learning.domain.entity.KanaCharacter;
import com.japanese.learning.domain.entity.ReviewCard;
import com.japanese.learning.domain.entity.ReviewLog;
import com.japanese.learning.domain.entity.User;
import com.japanese.learning.domain.entity.Vocabulary;
import com.japanese.learning.domain.enums.BadgeEvent;
import com.japanese.learning.domain.enums.CardState;
import com.japanese.learning.domain.enums.ItemType;
import com.japanese.learning.repository.KanaCharacterRepository;
import com.japanese.learning.repository.ReviewCardRepository;
import com.japanese.learning.repository.ReviewLogRepository;
import com.japanese.learning.repository.VocabularyRepository;
import com.japanese.learning.srs.FsrsEngine;
import com.japanese.learning.web.dto.LearningDtos.GradeRequest;
import com.japanese.learning.web.dto.LearningDtos.GradeResultDto;
import com.japanese.learning.web.dto.LearningDtos.ReviewQueueDto;
import com.japanese.learning.web.dto.LearningDtos.ReviewQueueItemDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Hàng đợi ôn tập và chấm thẻ.
 *
 * <p>Thẻ được tạo lười (lazy): không sinh sẵn hàng nghìn dòng NEW cho mỗi tài khoản mới,
 * mà chỉ vật chất hoá đúng số thẻ mới mà người học được phép nhận trong ngày.
 */
@Service
@RequiredArgsConstructor
public class ReviewService {

    private static final Set<ItemType> KANA_TYPES = EnumSet.of(ItemType.KANA_WRITING, ItemType.KANA_READING);
    private static final Set<ItemType> VOCAB_TYPES = EnumSet.of(ItemType.VOCAB_MEANING, ItemType.VOCAB_READING);

    private final ReviewCardRepository reviewCardRepository;
    private final ReviewLogRepository reviewLogRepository;
    private final KanaCharacterRepository kanaCharacterRepository;
    private final VocabularyRepository vocabularyRepository;
    private final GamificationService gamificationService;
    private final BadgeService badgeService;
    private final EntitlementService entitlementService;
    private final AppProperties properties;

    /**
     * Hàng đợi: thẻ đến hạn trước, sau đó bổ sung thẻ mới cho tới khi đủ {@code limit},
     * nhưng không vượt quá hạn mức thẻ mới mỗi ngày.
     */
    @Transactional
    public ReviewQueueDto queue(User user, int limit, Collection<ItemType> requestedTypes) {
        int size = Math.min(Math.max(limit, 1), 100);
        Set<ItemType> types = (requestedTypes == null || requestedTypes.isEmpty())
                ? EnumSet.allOf(ItemType.class)
                : EnumSet.copyOf(requestedTypes);

        Instant now = Instant.now();
        List<ReviewCard> due = reviewCardRepository.findDueCards(
                user.getId(), now, types, CardState.NEW, PageRequest.of(0, size));

        List<ReviewCard> fresh = List.of();
        int remaining = size - due.size();
        if (remaining > 0) {
            int newQuota = remainingNewCardQuota(user, now);
            if (newQuota > 0) {
                materializeNewCards(user, types, Math.min(remaining, newQuota), now);
                fresh = reviewCardRepository.findNewCards(
                        user.getId(), types, CardState.NEW,
                        PageRequest.of(0, Math.min(remaining, newQuota)));
            }
        }

        List<ReviewCard> all = new ArrayList<>(due.size() + fresh.size());
        all.addAll(due);
        all.addAll(fresh);
        return new ReviewQueueDto(toQueueItems(all), due.size(), fresh.size());
    }

    /** Chấm một thẻ: cập nhật FSRS, ghi nhật ký, cộng XP và xét huy hiệu. */
    @Transactional
    public GradeResultDto grade(User user, GradeRequest request) {
        entitlementService.ensureWithinQuota(user, EntitlementService.FEATURE_DAILY_REVIEWS);

        ReviewCard card = reviewCardRepository.findById(request.cardId())
                .filter(candidate -> candidate.getUserId().equals(user.getId()))
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy thẻ ôn tương ứng"));

        Instant now = Instant.now();
        // Chụp lại trạng thái trước khi FSRS ghi đè: nhật ký cần cả hai đầu để về sau tối ưu tham số.
        CardSnapshot before = CardSnapshot.of(card, now);
        FsrsEngine.FsrsResult result = applyFsrs(card, request.grade(), now);

        Short score = request.score() == null ? null : request.score().shortValue();
        writeLog(card, before, request.grade(), score, result, now, request.durationMs());

        int xp = GamificationService.reviewXp(request.grade());
        GamificationService.ActivityOutcome outcome = gamificationService.recordActivity(
                user, GamificationService.ActivityDelta.review(xp, orZero(request.durationMs())));
        badgeService.evaluate(user.getId(), BadgeEvent.REVIEW_GRADED);

        return new GradeResultDto(card.getId(), card.getDueAt(), result.intervalDays(),
                card.getStability(), card.getDifficulty(), card.getState(), outcome.xpAwarded());
    }

    /**
     * Áp kết quả FSRS lên thẻ. Tách riêng để {@code WritingService} tái sử dụng
     * đúng một cài đặt duy nhất, tránh hai nhánh lịch trình lệch nhau.
     */
    @Transactional
    public FsrsEngine.FsrsResult applyFsrs(ReviewCard card, int grade, Instant now) {
        double elapsedDays = card.elapsedDaysAt(now);
        FsrsEngine.FsrsResult result = FsrsEngine.review(
                card.toFsrsState(), grade, elapsedDays, now, properties.srs().desiredRetention());

        card.applyFsrsState(result.next());
        card.setDueAt(result.dueAt());
        card.setLastReviewedAt(now);
        reviewCardRepository.save(card);
        return result;
    }

    /** Ảnh chụp trạng thái thẻ ngay trước khi chấm, dùng làm phần "before" của nhật ký. */
    public record CardSnapshot(CardState state, double stability, double difficulty, double elapsedDays) {

        public static CardSnapshot of(ReviewCard card, Instant now) {
            return new CardSnapshot(card.getState(), card.getStability(), card.getDifficulty(),
                    card.elapsedDaysAt(now));
        }
    }

    /** Ghi một dòng nhật ký bất biến cho mỗi lần chấm. */
    @Transactional
    public void writeLog(ReviewCard card,
                         CardSnapshot before,
                         int grade,
                         Short score,
                         FsrsEngine.FsrsResult result,
                         Instant now,
                         Integer durationMs) {
        reviewLogRepository.save(ReviewLog.builder()
                .cardId(card.getId())
                .userId(card.getUserId())
                .grade((short) grade)
                .score(score)
                .stateBefore(before.state())
                .stabilityBefore(before.stability())
                .stabilityAfter(result.next().stability())
                .difficultyBefore(before.difficulty())
                .difficultyAfter(result.next().difficulty())
                .elapsedDays(before.elapsedDays())
                .scheduledDays(result.intervalDays())
                .durationMs(durationMs)
                .reviewedAt(now)
                .build());
    }

    /** Lấy thẻ viết của một ký tự, tạo mới nếu người học chưa từng chạm tới. */
    @Transactional
    public ReviewCard findOrCreateCard(Long userId, ItemType itemType, Long itemId, Instant now) {
        return reviewCardRepository.findByUserIdAndItemTypeAndItemId(userId, itemType, itemId)
                .orElseGet(() -> reviewCardRepository.save(ReviewCard.builder()
                        .userId(userId)
                        .itemType(itemType)
                        .itemId(itemId)
                        .state(CardState.NEW)
                        .dueAt(now)
                        .build()));
    }

    /** Số thẻ mới còn được nhận trong ngày địa phương hiện tại. */
    private int remainingNewCardQuota(User user, Instant now) {
        LocalDay today = LocalDay.of(user.zoneId(), now);
        long introduced = reviewCardRepository.countIntroducedBetween(
                user.getId(), today.start(), today.endExclusive(), CardState.NEW);
        return (int) Math.max(properties.srs().newCardsPerDay() - introduced, 0);
    }

    /**
     * Tạo thêm thẻ NEW cho tới khi có đủ {@code needed} thẻ chờ.
     * Idempotent nhờ ràng buộc UNIQUE(user_id, item_type, item_id) và việc lọc theo id đã có thẻ.
     */
    private void materializeNewCards(User user, Set<ItemType> types, int needed, Instant now) {
        long available = reviewCardRepository.countNewAvailable(user.getId(), CardState.NEW);
        int missing = (int) (needed - available);
        if (missing <= 0) {
            return;
        }

        List<ReviewCard> toCreate = new ArrayList<>();
        for (ItemType type : types) {
            if (toCreate.size() >= missing) {
                break;
            }
            List<Long> itemIds = nextItemIds(user, type, missing - toCreate.size());
            for (Long itemId : itemIds) {
                toCreate.add(ReviewCard.builder()
                        .userId(user.getId())
                        .itemType(type)
                        .itemId(itemId)
                        .state(CardState.NEW)
                        .dueAt(now)
                        .build());
            }
        }
        if (!toCreate.isEmpty()) {
            reviewCardRepository.saveAll(toCreate);
        }
    }

    private List<Long> nextItemIds(User user, ItemType type, int count) {
        if (count <= 0) {
            return List.of();
        }
        if (KANA_TYPES.contains(type)) {
            List<Long> ids = kanaCharacterRepository.findIdsWithoutCard(user.getId(), type);
            return ids.subList(0, Math.min(count, ids.size()));
        }
        if (VOCAB_TYPES.contains(type)) {
            Set<Long> existing = new HashSet<>();
            reviewCardRepository.findByUserIdAndItemType(user.getId(), type)
                    .forEach(card -> existing.add(card.getItemId()));
            int minLevel = entitlementService.minJlptLevel(user.getPlan());
            List<Long> ids = new ArrayList<>();
            for (Vocabulary vocabulary : vocabularyRepository.findAll()) {
                if (ids.size() >= count) {
                    break;
                }
                if (existing.contains(vocabulary.getId())) {
                    continue;
                }
                if (vocabulary.getJlptLevel() != null && vocabulary.getJlptLevel() < minLevel) {
                    continue;
                }
                ids.add(vocabulary.getId());
            }
            return ids;
        }
        return List.of();
    }

    /** Nạp một lượt thông tin nội dung cho cả hàng đợi thay vì truy vấn theo từng thẻ. */
    private List<ReviewQueueItemDto> toQueueItems(List<ReviewCard> cards) {
        Set<Long> kanaIds = new HashSet<>();
        Set<Long> vocabIds = new HashSet<>();
        for (ReviewCard card : cards) {
            if (KANA_TYPES.contains(card.getItemType())) {
                kanaIds.add(card.getItemId());
            } else {
                vocabIds.add(card.getItemId());
            }
        }

        Map<Long, KanaCharacter> kana = new HashMap<>();
        if (!kanaIds.isEmpty()) {
            kanaCharacterRepository.findAllById(kanaIds).forEach(item -> kana.put(item.getId(), item));
        }
        Map<Long, Vocabulary> vocab = new HashMap<>();
        if (!vocabIds.isEmpty()) {
            vocabularyRepository.findAllById(vocabIds).forEach(item -> vocab.put(item.getId(), item));
        }

        List<ReviewQueueItemDto> items = new ArrayList<>(cards.size());
        for (ReviewCard card : cards) {
            KanaCharacter character = kana.get(card.getItemId());
            Vocabulary word = vocab.get(card.getItemId());
            boolean isKana = KANA_TYPES.contains(card.getItemType());
            items.add(new ReviewQueueItemDto(
                    card.getId(),
                    card.getItemType(),
                    card.getItemId(),
                    card.getState(),
                    card.getDueAt(),
                    card.getReps(),
                    card.getLapses(),
                    isKana && character != null ? character.getCharacter() : null,
                    isKana && character != null ? character.getRomaji() : null,
                    isKana && character != null ? character.getReadingVi() : null,
                    !isKana && word != null ? word.getWord() : null,
                    !isKana && word != null ? word.getReading() : null,
                    !isKana && word != null ? word.getMeaningVi() : null));
        }
        return items;
    }

    private int orZero(Integer value) {
        return value == null ? 0 : value;
    }
}
