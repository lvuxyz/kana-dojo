package com.japanese.learning.service;

import com.japanese.learning.config.AppProperties;
import com.japanese.learning.domain.entity.KanaCharacter;
import com.japanese.learning.domain.entity.ReviewCard;
import com.japanese.learning.domain.entity.User;
import com.japanese.learning.domain.enums.CardState;
import com.japanese.learning.domain.enums.ItemType;
import com.japanese.learning.domain.enums.Script;
import com.japanese.learning.repository.KanaCharacterRepository;
import com.japanese.learning.repository.ReviewCardRepository;
import com.japanese.learning.repository.WritingAttemptRepository;
import com.japanese.learning.web.dto.LearningDtos.KanaProgressDto;
import com.japanese.learning.web.dto.LearningDtos.ProgressSummaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Tiến độ học: lưới bảng chữ và số liệu tổng hợp cho màn hình chính. */
@Service
@RequiredArgsConstructor
public class ProgressService {

    /** Ngưỡng stability (ngày) để coi một thẻ là "đã thuộc chắc". */
    private static final double MASTERY_STABILITY_DAYS = 21.0;

    private static final Set<ItemType> VOCAB_TYPES =
            EnumSet.of(ItemType.VOCAB_MEANING, ItemType.VOCAB_READING);

    private final KanaCharacterRepository kanaCharacterRepository;
    private final ReviewCardRepository reviewCardRepository;
    private final WritingAttemptRepository writingAttemptRepository;
    private final AppProperties properties;

    /** Một ô cho mỗi ký tự, kể cả ký tự chưa từng học (level 0). */
    @Transactional(readOnly = true)
    public List<KanaProgressDto> kanaProgress(User user, Script script) {
        List<KanaCharacter> characters = script == null
                ? kanaCharacterRepository.findAllByOrderByDisplayOrderAsc()
                : kanaCharacterRepository.findByScriptOrderByDisplayOrderAsc(script);

        Map<Long, ReviewCard> cards = new HashMap<>();
        reviewCardRepository.findByUserIdAndItemType(user.getId(), ItemType.KANA_WRITING)
                .forEach(card -> cards.put(card.getItemId(), card));

        Map<Long, Integer> bestScores = new HashMap<>();
        for (Object[] row : writingAttemptRepository.findBestScores(user.getId())) {
            bestScores.put((Long) row[0], ((Number) row[1]).intValue());
        }

        return characters.stream()
                .map(character -> {
                    ReviewCard card = cards.get(character.getId());
                    return new KanaProgressDto(
                            character.getId(),
                            character.getCharacter(),
                            card == null ? CardState.NEW : card.getState(),
                            card == null ? null : card.getDueAt(),
                            bestScores.get(character.getId()),
                            masteryLevel(card));
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public ProgressSummaryDto summary(User user) {
        Long userId = user.getId();
        long kanaLearned = reviewCardRepository.countStarted(
                userId, EnumSet.of(ItemType.KANA_WRITING), CardState.NEW);
        long kanaMastered = reviewCardRepository.countMastered(
                userId, ItemType.KANA_WRITING, CardState.REVIEW, MASTERY_STABILITY_DAYS);
        long vocabLearned = reviewCardRepository.countStarted(userId, VOCAB_TYPES, CardState.NEW);
        long dueToday = reviewCardRepository.countDue(userId, Instant.now(), CardState.NEW);
        long newAvailable = Math.min(
                reviewCardRepository.countNewAvailable(userId, CardState.NEW),
                properties.srs().newCardsPerDay());

        return new ProgressSummaryDto(kanaLearned, kanaMastered, vocabLearned, dueToday, newAvailable);
    }

    /**
     * Quy trạng thái SRS thành thang 0..5 để lưới bảng chữ tô màu.
     * Dùng stability thay vì số lần ôn: hai người ôn 5 lần có thể ở hai mức nhớ rất khác nhau.
     */
    private int masteryLevel(ReviewCard card) {
        if (card == null || card.getState() == CardState.NEW) {
            return 0;
        }
        if (card.getState() == CardState.LEARNING || card.getState() == CardState.RELEARNING) {
            return 1;
        }
        double stability = card.getStability();
        if (stability < 7) {
            return 2;
        }
        if (stability < MASTERY_STABILITY_DAYS) {
            return 3;
        }
        if (stability < 60) {
            return 4;
        }
        return 5;
    }
}
