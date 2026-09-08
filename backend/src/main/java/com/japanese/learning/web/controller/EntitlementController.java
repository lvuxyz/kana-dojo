package com.japanese.learning.web.controller;

import com.japanese.learning.security.AppUserPrincipal;
import com.japanese.learning.service.CurrentUserService;
import com.japanese.learning.service.EntitlementService;
import com.japanese.learning.web.dto.EntitlementDtos.EntitlementsDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Entitlements", description = "Hạn mức theo gói cước và mức đã dùng trong ngày")
@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
public class EntitlementController {

    private final EntitlementService entitlementService;
    private final CurrentUserService currentUserService;

    @Operation(summary = "Hạn mức và mức sử dụng hiện tại")
    @GetMapping("/entitlements")
    public EntitlementsDto entitlements(@AuthenticationPrincipal AppUserPrincipal principal) {
        return entitlementService.entitlementsOf(currentUserService.require(principal));
    }
}
