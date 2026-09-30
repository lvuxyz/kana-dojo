// ĐANG TẮT — đồng bộ luyện gõ lên máy chủ (lưu kỷ lục, cộng XP/streak theo tài khoản).
// Phòng luyện gõ hiện chạy hoàn toàn trên máy người dùng (localStorage), nên mã này được giữ lại dưới dạng
// comment. Cách bật lại: docs/TYPING.md, mục "Mã đồng bộ máy chủ (đang tắt)".
//
// package com.japanese.learning.repository;
//
// import com.japanese.learning.domain.entity.TypingSession;
// import com.japanese.learning.domain.enums.TypingContentType;
// import com.japanese.learning.domain.enums.TypingInputMethod;
// import com.japanese.learning.domain.enums.TypingMode;
// import org.springframework.data.jpa.repository.JpaRepository;
// import org.springframework.data.jpa.repository.Query;
// import org.springframework.data.repository.query.Param;
// import org.springframework.stereotype.Repository;
//
// import java.time.Instant;
// import java.util.List;
//
// @Repository
// public interface TypingSessionRepository extends JpaRepository<TypingSession, Long> {
//
//     List<TypingSession> findTop10ByUserIdOrderByCreatedAtDescIdDesc(Long userId);
//
//     long countByUserId(Long userId);
//
//     @Query("select coalesce(sum(s.durationMs), 0) from TypingSession s where s.userId = :userId")
//     long sumDurationMs(@Param("userId") Long userId);
//
//     /** Điểm cao nhất trước đó của một tổ hợp; null nếu chưa từng gõ. */
//     @Query("""
//             select max(s.score) from TypingSession s
//             where s.userId = :userId and s.inputMethod = :method
//               and s.contentType = :content and s.mode = :mode
//             """)
//     Integer findBestScore(@Param("userId") Long userId,
//                           @Param("method") TypingInputMethod method,
//                           @Param("content") TypingContentType content,
//                           @Param("mode") TypingMode mode);
//
//     /** Kỷ lục theo từng tổ hợp cách nhập × nội dung × chế độ, tổ hợp chơi gần nhất đứng đầu. */
//     @Query("""
//             select s.inputMethod as inputMethod, s.contentType as contentType, s.mode as mode,
//                    max(s.score) as bestScore, max(s.kpm) as bestKpm, max(s.accuracy) as bestAccuracy,
//                    count(s) as plays, max(s.createdAt) as lastPlayedAt
//             from TypingSession s
//             where s.userId = :userId
//             group by s.inputMethod, s.contentType, s.mode
//             order by max(s.createdAt) desc
//             """)
//     List<BestRow> findBests(@Param("userId") Long userId);
//
//     interface BestRow {
//         TypingInputMethod getInputMethod();
//
//         TypingContentType getContentType();
//
//         TypingMode getMode();
//
//         Integer getBestScore();
//
//         Double getBestKpm();
//
//         Double getBestAccuracy();
//
//         Long getPlays();
//
//         Instant getLastPlayedAt();
//     }
// }
