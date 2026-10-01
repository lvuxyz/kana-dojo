// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.repository;
//
// import com.japanese.learning.domain.entity.RefreshToken;
// import org.springframework.data.jpa.repository.JpaRepository;
// import org.springframework.data.jpa.repository.Modifying;
// import org.springframework.data.jpa.repository.Query;
// import org.springframework.data.repository.query.Param;
// import org.springframework.stereotype.Repository;
//
// import java.time.Instant;
// import java.util.Optional;
// import java.util.UUID;
//
// @Repository
// public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
//
//     Optional<RefreshToken> findByTokenHash(String tokenHash);
//
//     /** Thu hồi toàn bộ họ token khi phát hiện một token đã dùng lại được trình lần nữa. */
//     @Modifying(clearAutomatically = true, flushAutomatically = true)
//     @Query("update RefreshToken t set t.revokedAt = :now, t.updatedAt = :now "
//             + "where t.familyId = :familyId and t.revokedAt is null")
//     int revokeFamily(@Param("familyId") UUID familyId, @Param("now") Instant now);
//
//     @Modifying(clearAutomatically = true, flushAutomatically = true)
//     @Query("update RefreshToken t set t.revokedAt = :now, t.updatedAt = :now "
//             + "where t.userId = :userId and t.revokedAt is null")
//     int revokeAllForUser(@Param("userId") Long userId, @Param("now") Instant now);
//
//     @Modifying
//     @Query("delete from RefreshToken t where t.expiresAt < :cutoff")
//     int deleteExpired(@Param("cutoff") Instant cutoff);
// }
