package com.japanese.learning.repository;

import com.japanese.learning.domain.entity.KanaGlyph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KanaGlyphRepository extends JpaRepository<KanaGlyph, String> {

    List<KanaGlyph> findAllByOrderByGlyphAsc();
}
