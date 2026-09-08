package com.japanese.learning.web.controller;

import com.japanese.learning.domain.enums.ItemType;
import com.japanese.learning.security.AppUserPrincipal;
import com.japanese.learning.service.CurrentUserService;
import com.japanese.learning.service.ReviewService;
import com.japanese.learning.web.dto.LearningDtos.GradeRequest;
import com.japanese.learning.web.dto.LearningDtos.GradeResultDto;
import com.japanese.learning.web.dto.LearningDtos.ReviewQueueDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Reviews", description = "Hàng đợi ôn tập và chấm thẻ theo FSRS-6")
@RestController
@RequestMapping("/api/v1/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;
    private final CurrentUserService currentUserService;

    @Operation(summary = "Hàng đợi ôn: thẻ đến hạn cộng thẻ mới trong hạn mức ngày")
    @GetMapping("/queue")
    public ReviewQueueDto queue(@AuthenticationPrincipal AppUserPrincipal principal,
                                @RequestParam(defaultValue = "20") int limit,
                                @RequestParam(required = false) List<ItemType> types) {
        return reviewService.queue(currentUserService.require(principal), limit, types);
    }

    @Operation(summary = "Chấm một thẻ và nhận lịch ôn kế tiếp")
    @PostMapping("/grade")
    public GradeResultDto grade(@AuthenticationPrincipal AppUserPrincipal principal,
                                @Valid @RequestBody GradeRequest request) {
        return reviewService.grade(currentUserService.require(principal), request);
    }
}
