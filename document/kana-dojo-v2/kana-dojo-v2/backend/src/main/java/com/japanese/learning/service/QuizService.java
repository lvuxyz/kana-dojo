package com.japanese.learning.service;

import com.japanese.learning.common.ApiException;
import com.japanese.learning.common.PageResponse;
import com.japanese.learning.domain.entity.Question;
import com.japanese.learning.domain.entity.Quiz;
import com.japanese.learning.domain.entity.QuizAnswer;
import com.japanese.learning.domain.entity.QuizAttempt;
import com.japanese.learning.domain.entity.User;
import com.japanese.learning.domain.enums.BadgeEvent;
import com.japanese.learning.repository.QuestionRepository;
import com.japanese.learning.repository.QuizAnswerRepository;
import com.japanese.learning.repository.QuizAttemptRepository;
import com.japanese.learning.repository.QuizRepository;
import com.japanese.learning.web.dto.QuizDtos.AnswerInput;
import com.japanese.learning.web.dto.QuizDtos.AnswerResultDto;
import com.japanese.learning.web.dto.QuizDtos.QuestionDto;
import com.japanese.learning.web.dto.QuizDtos.QuizAttemptDto;
import com.japanese.learning.web.dto.QuizDtos.QuizDetailDto;
import com.japanese.learning.web.dto.QuizDtos.QuizDto;
import com.japanese.learning.web.dto.QuizDtos.QuizResultDto;
import com.japanese.learning.web.dto.QuizDtos.SubmitQuizRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class QuizService {

    private final QuizRepository quizRepository;
    private final QuestionRepository questionRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizAnswerRepository quizAnswerRepository;
    private final GamificationService gamificationService;
    private final BadgeService badgeService;

    @Transactional(readOnly = true)
    public PageResponse<QuizDto> listPublished(Pageable pageable) {
        return PageResponse.of(quizRepository.findPublished(pageable),
                quiz -> toDto(quiz, questionRepository.countByQuizId(quiz.getId())));
    }

    /** Đề bài gửi cho client không kèm đáp án đúng. */
    @Transactional(readOnly = true)
    public QuizDetailDto detail(Long quizId) {
        Quiz quiz = requirePublishedQuiz(quizId);
        List<QuestionDto> questions = questionRepository.findByQuizIdOrderByPositionAsc(quizId).stream()
                .map(question -> new QuestionDto(
                        question.getId(),
                        question.getPrompt(),
                        question.getQuestionType(),
                        question.getOptions(),
                        question.getPosition()))
                .toList();
        return new QuizDetailDto(quiz.getId(), quiz.getTitle(), quiz.getDescription(), quiz.getQuizType(),
                quiz.getJlptLevel(), quiz.getTimeLimitSec(), questions);
    }

    @Transactional
    public QuizAttemptDto startAttempt(User user, Long quizId) {
        requirePublishedQuiz(quizId);
        int totalCount = (int) questionRepository.countByQuizId(quizId);
        QuizAttempt attempt = quizAttemptRepository.save(QuizAttempt.builder()
                .userId(user.getId())
                .quizId(quizId)
                .totalCount(totalCount)
                .startedAt(Instant.now())
                .build());
        return new QuizAttemptDto(attempt.getId(), quizId, attempt.getStartedAt(), totalCount);
    }

    /** Chấm bài và cộng XP: 20 điểm cơ bản cộng 5 cho mỗi câu đúng. */
    @Transactional
    public QuizResultDto submit(User user, Long attemptId, SubmitQuizRequest request) {
        QuizAttempt attempt = quizAttemptRepository.findById(attemptId)
                .filter(candidate -> candidate.getUserId().equals(user.getId()))
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy lượt làm bài"));
        if (attempt.getSubmittedAt() != null) {
            throw ApiException.validation("Lượt làm bài này đã được nộp");
        }

        Map<Long, Question> questions = new HashMap<>();
        for (Question question : questionRepository.findByQuizIdOrderByPositionAsc(attempt.getQuizId())) {
            questions.put(question.getId(), question);
        }

        List<AnswerResultDto> results = new ArrayList<>();
        List<QuizAnswer> answers = new ArrayList<>();
        int correctCount = 0;

        for (AnswerInput input : request.answers()) {
            Question question = questions.get(input.questionId());
            if (question == null) {
                // Câu hỏi không thuộc đề này: bỏ qua thay vì làm hỏng cả bài nộp.
                continue;
            }
            boolean correct = isCorrect(question.getCorrectAnswer(), input.givenAnswer());
            if (correct) {
                correctCount++;
            }
            answers.add(QuizAnswer.builder()
                    .attemptId(attempt.getId())
                    .questionId(question.getId())
                    .givenAnswer(input.givenAnswer())
                    .correct(correct)
                    .build());
            results.add(new AnswerResultDto(question.getId(), input.givenAnswer(), correct,
                    question.getCorrectAnswer(), question.getExplanationVi()));
        }

        quizAnswerRepository.deleteByAttemptId(attempt.getId());
        quizAnswerRepository.saveAll(answers);

        int totalCount = Math.max(questions.size(), 1);
        int score = (int) Math.round(100.0 * correctCount / totalCount);
        Instant now = Instant.now();

        attempt.setCorrectCount(correctCount);
        attempt.setTotalCount(questions.size());
        attempt.setScore((short) score);
        attempt.setSubmittedAt(now);
        attempt.setDurationMs((int) Math.min(
                now.toEpochMilli() - attempt.getStartedAt().toEpochMilli(), Integer.MAX_VALUE));
        quizAttemptRepository.save(attempt);

        int xp = GamificationService.quizXp(correctCount);
        GamificationService.ActivityOutcome outcome = gamificationService.recordActivity(
                user, GamificationService.ActivityDelta.quiz(xp, attempt.getDurationMs()));
        badgeService.evaluate(user.getId(), BadgeEvent.QUIZ_SUBMITTED);

        return new QuizResultDto(attempt.getId(), attempt.getQuizId(), score, correctCount,
                questions.size(), outcome.xpAwarded(), results);
    }

    private Quiz requirePublishedQuiz(Long quizId) {
        return quizRepository.findById(quizId)
                .filter(Quiz::isPublished)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy bài kiểm tra"));
    }

    /** So khớp bỏ qua khoảng trắng thừa và hoa thường: người học gõ tay romaji rất dễ lệch. */
    private boolean isCorrect(String expected, String given) {
        if (given == null) {
            return false;
        }
        return expected.trim().equalsIgnoreCase(given.trim());
    }

    private QuizDto toDto(Quiz quiz, long questionCount) {
        return new QuizDto(quiz.getId(), quiz.getTitle(), quiz.getDescription(), quiz.getQuizType(),
                quiz.getJlptLevel(), quiz.getTimeLimitSec(), questionCount);
    }
}
