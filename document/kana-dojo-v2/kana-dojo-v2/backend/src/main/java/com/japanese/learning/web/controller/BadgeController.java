package com.japanese.learning.web.controller;

import com.japanese.learning.security.AppUserPrincipal;
import com.japanese.learning.service.BadgeService;
import com.japanese.learning.service.CurrentUserService;
import com.japanese.learning.web.dto.GamificationDtos.BadgeDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Badges", description = "Huy hiệu")
@RestController
@RequestMapping("/api/v1/badges")
@RequiredArgsConstructor
public class BadgeController {

    private final BadgeService badgeService;
    private final CurrentUserService currentUserService;

    @Operation(summary = "Tất cả huy hiệu kèm thời điểm đạt được của người dùng")
    @GetMapping
    public List<BadgeDto> list(@AuthenticationPrincipal AppUserPrincipal principal) {
        return badgeService.listFor(currentUserService.require(principal).getId());
    }
}
