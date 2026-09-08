package com.japanese.learning.repository;

import com.japanese.learning.domain.entity.Deck;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeckRepository extends JpaRepository<Deck, Long> {

    @Query("select d from Deck d where d.isPublic = true order by d.id asc")
    List<Deck> findPublicDecks();

    @Query("select d from Deck d where d.isPublic = true or d.ownerId = :ownerId order by d.id asc")
    List<Deck> findVisibleTo(@Param("ownerId") Long ownerId);
}
