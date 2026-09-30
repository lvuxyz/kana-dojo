package com.japanese.learning.service;

import com.japanese.learning.common.ApiException;
import com.japanese.learning.domain.entity.TypingSession;
import com.japanese.learning.domain.entity.User;
import com.japanese.learning.repository.TypingSessionRepository;
import com.japanese.learning.typing.TypingScoring;
import com.japanese.learning.web.dto.TypingDtos.TypingBestDto;
import com.japanese.learning.web.dto.TypingDtos.TypingResultDto;
import com.japanese.learning.web.dto.TypingDtos.TypingSessionDto;
import com.japanese.learning.web.dto.TypingDtos.TypingSessionRequest;
import com.japanese.learning.web.dto.TypingDtos.TypingStatsDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * Ghi nhận lượt luyện gõ: tính lại điểm từ số đo thô, lưu, cộng XP/streak và so với kỷ lục cũ —
 * tất cả trong một giao dịch, cùng lý do với {@link WritingService}.
 */
@Service
@RequiredArgsConstructor
public class TypingService {

    private final TypingSessionRepository typingSessionRepository;
    private final GamificationService gamificationService;

    @Transactional
    public TypingResultDto record(User user, TypingSessionRequest request) {
        int correct = request.correctKeys();
        int miss = request.missKeys();
        int durationMs = request.durationMs();

        double kpm = TypingScoring.kpm(correct, durationMs);
        if (kpm > TypingScoring.MAX_PLAUSIBLE_KPM) {
            throw ApiException.validation(
                    "Tốc độ gõ vượt ngưỡng hợp lý (" + Math.round(kpm) + " phím/phút)",
                    Map.of("correctKeys", "Quá nhiều phím so với thời gian gõ"));
        }
        double accuracy = TypingScoring.accuracy(correct, miss);
        int score = TypingScoring.score(request.mode(), correct, miss, durationMs);

        // Hỏi kỷ lục cũ trước khi lưu, nếu không chính lượt này sẽ tự so với nó.
        Integer previousBest = typingSessionRepository.findBestScore(
                user.getId(), request.inputMethod(), request.contentType(), request.mode());

        int xp = GamificationService.typingXp(correct);
        GamificationService.ActivityOutcome outcome = gamificationService.recordActivity(
                user, GamificationService.ActivityDelta.typing(xp, durationMs));

        TypingSession session = typingSessionRepository.save(TypingSession.builder()
                .userId(user.getId())
                .inputMethod(request.inputMethod())
                .contentType(request.contentType())
                .mode(request.mode())
                .durationMs(durationMs)
                .correctKeys(correct)
                .missKeys(miss)
                .charsTyped(request.charsTyped())
                .phrasesCompleted(request.phrasesCompleted())
                .kpm(kpm)
                .accuracy(accuracy)
                .score(score)
                .xpEarned(outcome.xpAwarded())
                .build());

        boolean newBest = previousBest == null || score > previousBest;
        int personalBest = previousBest == null ? score : Math.max(previousBest, score);
        return new TypingResultDto(session.getId(), score, kpm, accuracy, outcome.xpAwarded(), personalBest, newBest);
    }

    @Transactional(readOnly = true)
    public TypingStatsDto stats(User user) {
        List<TypingBestDto> bests = typingSessionRepository.findBests(user.getId()).stream()
                .map(row -> new TypingBestDto(row.getInputMethod(), row.getContentType(), row.getMode(),
                        row.getBestScore(), row.getBestKpm(), row.getBestAccuracy(), row.getPlays(),
                        row.getLastPlayedAt()))
                .toList();
        List<TypingSessionDto> recent = typingSessionRepository
                .findTop10ByUserIdOrderByCreatedAtDescIdDesc(user.getId()).stream()
                .map(s -> new TypingSessionDto(s.getId(), s.getInputMethod(), s.getContentType(), s.getMode(),
                        s.getScore(), s.getKpm(), s.getAccuracy(), s.getDurationMs(), s.getCreatedAt()))
                .toList();
        return new TypingStatsDto(typingSessionRepository.countByUserId(user.getId()),
                typingSessionRepository.sumDurationMs(user.getId()), bests, recent);
    }
}
