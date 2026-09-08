package com.japanese.learning.repository;

import com.japanese.learning.domain.entity.Quiz;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface QuizRepository extends JpaRepository<Quiz, Long> {

    @Query("select q from Quiz q where q.published = true")
    Page<Quiz> findPublished(Pageable pageable);
}
