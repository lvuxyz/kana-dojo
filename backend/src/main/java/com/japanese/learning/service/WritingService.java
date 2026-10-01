// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.service;
//
// import com.japanese.learning.common.ApiException;
// import com.japanese.learning.domain.StrokeError;
// import com.japanese.learning.domain.entity.KanaCharacter;
// import com.japanese.learning.domain.entity.ReviewCard;
// import com.japanese.learning.domain.entity.User;
// import com.japanese.learning.domain.entity.WritingAttempt;
// import com.japanese.learning.domain.enums.BadgeEvent;
// import com.japanese.learning.domain.enums.ItemType;
// import com.japanese.learning.repository.KanaCharacterRepository;
// import com.japanese.learning.repository.WritingAttemptRepository;
// import com.japanese.learning.srs.FsrsEngine;
// import com.japanese.learning.web.dto.LearningDtos.GradeResultDto;
// import com.japanese.learning.web.dto.LearningDtos.WritingAttemptRequest;
// import com.japanese.learning.web.dto.LearningDtos.WritingResultDto;
// import lombok.RequiredArgsConstructor;
// import org.springframework.stereotype.Service;
// import org.springframework.transaction.annotation.Transactional;
//
// import java.time.Instant;
// import java.util.List;
//
// /**
//  * Ghi nhận một lần luyện viết.
//  *
//  * <p>Toàn bộ năm việc dưới đây nằm trong <b>một giao dịch duy nhất</b>:
//  * <ol>
//  *   <li>lưu {@code writing_attempts};</li>
//  *   <li>suy ra grade từ điểm nét;</li>
//  *   <li>cập nhật {@code review_cards} bằng FSRS;</li>
//  *   <li>ghi {@code review_logs};</li>
//  *   <li>cộng XP / streak / {@code daily_activity} rồi xét huy hiệu.</li>
//  * </ol>
//  * Tách thành nhiều lần gọi API sẽ để lại trạng thái nửa vời khi mạng rớt giữa chừng:
//  * điểm đã ghi nhưng lịch ôn chưa cập nhật, hoặc ngược lại.
//  */
// @Service
// @RequiredArgsConstructor
// public class WritingService {
//
//     private final WritingAttemptRepository writingAttemptRepository;
//     private final KanaCharacterRepository kanaCharacterRepository;
//     private final ReviewService reviewService;
//     private final GamificationService gamificationService;
//     private final BadgeService badgeService;
//     private final EntitlementService entitlementService;
//
//     @Transactional
//     public WritingResultDto recordAttempt(User user, WritingAttemptRequest request) {
//         entitlementService.ensureWithinQuota(user, EntitlementService.FEATURE_DAILY_WRITING);
//
//         KanaCharacter character = kanaCharacterRepository.findById(request.kanaCharacterId())
//                 .orElseThrow(() -> ApiException.notFound("Không tìm thấy ký tự kana cần luyện viết"));
//
//         List<StrokeError> strokeErrors = request.strokeErrors() == null ? List.of() : request.strokeErrors();
//         boolean anyStrokeFailed = !strokeErrors.isEmpty();
//         int grade = FsrsEngine.gradeFromScore(request.avgScore(), anyStrokeFailed);
//         boolean passed = grade >= 3;
//
//         // Phải hỏi trước khi lưu lần này, nếu không chính nó sẽ tự làm mất phần thưởng "đạt lần đầu".
//         boolean alreadyPassedBefore = writingAttemptRepository
//                 .existsByUserIdAndKanaCharacterIdAndPassedTrue(user.getId(), character.getId());
//
//         // (1) Lưu bài viết thô, kể cả khi không đạt — đây là dữ liệu để cải thiện bộ chấm nét.
//         writingAttemptRepository.save(WritingAttempt.builder()
//                 .userId(user.getId())
//                 .kanaCharacterId(character.getId())
//                 .mode(request.mode())
//                 .avgScore((short) request.avgScore().intValue())
//                 .strokeScores(request.strokeScores())
//                 .strokeErrors(strokeErrors)
//                 .passed(passed)
//                 .durationMs(request.durationMs())
//                 .build());
//
//         Instant now = Instant.now();
//
//         // (2)(3) Grade đã đo được ở trên; áp thẳng vào lịch ôn của thẻ viết tương ứng.
//         ReviewCard card = reviewService.findOrCreateCard(
//                 user.getId(), ItemType.KANA_WRITING, character.getId(), now);
//         ReviewService.CardSnapshot before = ReviewService.CardSnapshot.of(card, now);
//         FsrsEngine.FsrsResult result = reviewService.applyFsrs(card, grade, now);
//
//         // (4) Ghi kèm điểm gốc để sau này huấn luyện lại tham số FSRS theo từng người.
//         reviewService.writeLog(card, before, grade,
//                 (short) request.avgScore().intValue(), result, now, request.durationMs());
//
//         // (5) XP: đạt lần đầu một ký tự được thưởng đậm hơn hẳn một lượt ôn thường.
//         boolean firstPass = passed && !alreadyPassedBefore;
//         int xp = firstPass
//                 ? GamificationService.XP_WRITING_FIRST_PASS
//                 : GamificationService.reviewXp(grade);
//         GamificationService.ActivityOutcome outcome = gamificationService.recordActivity(
//                 user, GamificationService.ActivityDelta.writing(xp, orZero(request.durationMs())));
//
//         List<String> newBadges = badgeService.evaluate(user.getId(), BadgeEvent.WRITING_ATTEMPT);
//
//         GradeResultDto cardResult = new GradeResultDto(
//                 card.getId(), card.getDueAt(), result.intervalDays(),
//                 card.getStability(), card.getDifficulty(), card.getState(), outcome.xpAwarded());
//
//         return new WritingResultDto(passed, request.avgScore(), grade, outcome.xpAwarded(), cardResult, newBadges);
//     }
//
//     private int orZero(Integer value) {
//         return value == null ? 0 : value;
//     }
// }
