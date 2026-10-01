// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.repository;
//
// import com.japanese.learning.domain.entity.LeaderboardSnapshot;
// import org.springframework.data.jpa.repository.JpaRepository;
// import org.springframework.stereotype.Repository;
//
// import java.time.LocalDate;
// import java.util.List;
// import java.util.Optional;
//
// @Repository
// public interface LeaderboardSnapshotRepository extends JpaRepository<LeaderboardSnapshot, Long> {
//
//     List<LeaderboardSnapshot> findByWeekStartOrderByRankAsc(LocalDate weekStart);
//
//     Optional<LeaderboardSnapshot> findByWeekStartAndUserId(LocalDate weekStart, Long userId);
//
//     void deleteByWeekStart(LocalDate weekStart);
// }
