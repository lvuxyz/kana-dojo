package com.japanese.learning.service;

import com.japanese.learning.domain.entity.Deck;
import com.japanese.learning.repository.DeckItemRepository;
import com.japanese.learning.repository.DeckRepository;
import com.japanese.learning.web.dto.ContentDtos.DeckDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DeckService {

    private final DeckRepository deckRepository;
    private final DeckItemRepository deckItemRepository;

    /**
     * Bộ thẻ nhìn thấy được: luôn gồm bộ công khai, cộng thêm bộ riêng của người dùng
     * khi request có danh tính.
     */
    @Transactional(readOnly = true)
    public List<DeckDto> list(boolean publicOnly, Long currentUserId) {
        List<Deck> decks = (publicOnly || currentUserId == null)
                ? deckRepository.findPublicDecks()
                : deckRepository.findVisibleTo(currentUserId);
        return decks.stream().map(this::toDto).toList();
    }

    private DeckDto toDto(Deck deck) {
        int itemCount = deckItemRepository.findByDeckIdOrderByPositionAsc(deck.getId()).size();
        return new DeckDto(
                deck.getId(),
                deck.getName(),
                deck.getDescription(),
                deck.isPublic(),
                deck.getJlptLevel(),
                deck.getItemType(),
                itemCount);
    }
}
