// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.repository;
//
// import com.japanese.learning.domain.entity.WritingAttempt;
// import org.springframework.data.jpa.repository.JpaRepository;
// import org.springframework.data.jpa.repository.Query;
// import org.springframework.data.repository.query.Param;
// import org.springframework.stereotype.Repository;
//
// import java.time.Instant;
// import java.util.List;
//
// @Repository
// public interface WritingAttemptRepository extends JpaRepository<WritingAttempt, Long> {
//
//     @Query("select count(a) from WritingAttempt a where a.userId = :userId and a.createdAt >= :from and a.createdAt < :to")
//     long countBetween(@Param("userId") Long userId, @Param("from") Instant from, @Param("to") Instant to);
//
//     boolean existsByUserIdAndKanaCharacterIdAndPassedTrue(Long userId, Long kanaCharacterId);
//
//     boolean existsByUserIdAndPassedTrue(Long userId);
//
//     /** 10 lần viết gần nhất, dùng để xét huy hiệu "10 điểm tuyệt đối" theo chuỗi liên tiếp. */
//     List<WritingAttempt> findTop10ByUserIdOrderByCreatedAtDesc(Long userId);
//
//     /** Điểm cao nhất từng đạt của mỗi ký tự, phục vụ lưới tiến độ bảng chữ. */
//     @Query("select a.kanaCharacterId, max(a.avgScore) from WritingAttempt a where a.userId = :userId group by a.kanaCharacterId")
//     List<Object[]> findBestScores(@Param("userId") Long userId);
// }
