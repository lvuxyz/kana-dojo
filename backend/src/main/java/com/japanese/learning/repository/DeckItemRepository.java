package com.japanese.learning.repository;

import com.japanese.learning.domain.entity.DeckItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeckItemRepository extends JpaRepository<DeckItem, Long> {

    List<DeckItem> findByDeckIdOrderByPositionAsc(Long deckId);
}
