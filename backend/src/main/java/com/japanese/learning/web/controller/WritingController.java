package com.japanese.learning.web.controller;

import com.japanese.learning.security.AppUserPrincipal;
import com.japanese.learning.service.CurrentUserService;
import com.japanese.learning.service.WritingService;
import com.japanese.learning.web.dto.LearningDtos.WritingAttemptRequest;
import com.japanese.learning.web.dto.LearningDtos.WritingResultDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Writing", description = "Luyện viết nét và chấm điểm")
@RestController
@RequestMapping("/api/v1/writing")
@RequiredArgsConstructor
public class WritingController {

    private final WritingService writingService;
    private final CurrentUserService currentUserService;

    @Operation(summary = "Ghi nhận một lần luyện viết (một giao dịch: lưu bài, cập nhật SRS, XP, huy hiệu)")
    @PostMapping("/attempts")
    public WritingResultDto record(@AuthenticationPrincipal AppUserPrincipal principal,
                                   @Valid @RequestBody WritingAttemptRequest request) {
        return writingService.recordAttempt(currentUserService.require(principal), request);
    }
}
