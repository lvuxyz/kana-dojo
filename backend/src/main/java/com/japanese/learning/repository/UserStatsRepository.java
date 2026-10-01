// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.repository;
//
// import com.japanese.learning.domain.entity.UserStats;
// import org.springframework.data.jpa.repository.JpaRepository;
// import org.springframework.data.jpa.repository.Modifying;
// import org.springframework.data.jpa.repository.Query;
// import org.springframework.data.repository.query.Param;
// import org.springframework.stereotype.Repository;
//
// import java.util.Optional;
//
// @Repository
// public interface UserStatsRepository extends JpaRepository<UserStats, Long> {
//
//     Optional<UserStats> findByUserId(Long userId);
//
//     /** Hồi đầy thẻ băng mỗi thứ Hai; chạy một câu lệnh cho toàn bộ người dùng. */
//     @Modifying(clearAutomatically = true, flushAutomatically = true)
//     @Query("update UserStats s set s.streakFreezes = :maxFreezes where s.streakFreezes < :maxFreezes")
//     int refillStreakFreezes(@Param("maxFreezes") short maxFreezes);
// }
