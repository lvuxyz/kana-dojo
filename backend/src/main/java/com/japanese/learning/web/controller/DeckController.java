package com.japanese.learning.web.controller;

import com.japanese.learning.security.AppUserPrincipal;
import com.japanese.learning.service.DeckService;
import com.japanese.learning.web.dto.ContentDtos.DeckDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Decks", description = "Bộ thẻ học")
@RestController
@RequestMapping("/api/v1/decks")
@RequiredArgsConstructor
public class DeckController {

    private final DeckService deckService;

    @Operation(summary = "Danh sách bộ thẻ")
    @GetMapping
    public List<DeckDto> list(@AuthenticationPrincipal AppUserPrincipal principal,
                              @RequestParam(name = "public", defaultValue = "true") boolean publicOnly) {
        return deckService.list(publicOnly, principal == null ? null : principal.id());
    }
}
