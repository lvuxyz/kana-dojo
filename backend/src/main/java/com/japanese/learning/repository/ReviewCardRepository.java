// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.repository;
//
// import com.japanese.learning.domain.entity.ReviewCard;
// import com.japanese.learning.domain.enums.CardState;
// import com.japanese.learning.domain.enums.ItemType;
// import com.japanese.learning.domain.enums.KanaGroup;
// import com.japanese.learning.domain.enums.Script;
// import org.springframework.data.domain.Pageable;
// import org.springframework.data.jpa.repository.JpaRepository;
// import org.springframework.data.jpa.repository.Query;
// import org.springframework.data.repository.query.Param;
// import org.springframework.stereotype.Repository;
//
// import java.time.Instant;
// import java.util.Collection;
// import java.util.List;
// import java.util.Optional;
//
// @Repository
// public interface ReviewCardRepository extends JpaRepository<ReviewCard, Long> {
//
//     Optional<ReviewCard> findByUserIdAndItemTypeAndItemId(Long userId, ItemType itemType, Long itemId);
//
//     List<ReviewCard> findByUserIdAndItemType(Long userId, ItemType itemType);
//
//     List<ReviewCard> findByUserIdAndItemTypeAndItemIdIn(Long userId, ItemType itemType, Collection<Long> itemIds);
//
//     /** Hàng đợi thẻ đến hạn: chỉ thẻ đã bắt đầu học, sắp theo mức trễ hạn. */
//     @Query("""
//             select c from ReviewCard c
//             where c.userId = :userId
//               and c.suspended = false
//               and c.state <> :newState
//               and c.dueAt <= :now
//               and c.itemType in :types
//             order by c.dueAt asc
//             """)
//     List<ReviewCard> findDueCards(@Param("userId") Long userId,
//                                   @Param("now") Instant now,
//                                   @Param("types") Collection<ItemType> types,
//                                   @Param("newState") CardState newState,
//                                   Pageable pageable);
//
//     @Query("""
//             select c from ReviewCard c
//             where c.userId = :userId
//               and c.suspended = false
//               and c.state = :newState
//               and c.itemType in :types
//             order by c.itemId asc
//             """)
//     List<ReviewCard> findNewCards(@Param("userId") Long userId,
//                                   @Param("types") Collection<ItemType> types,
//                                   @Param("newState") CardState newState,
//                                   Pageable pageable);
//
//     @Query("""
//             select count(c) from ReviewCard c
//             where c.userId = :userId and c.suspended = false
//               and c.state <> :newState and c.dueAt <= :now
//             """)
//     long countDue(@Param("userId") Long userId,
//                   @Param("now") Instant now,
//                   @Param("newState") CardState newState);
//
//     @Query("select count(c) from ReviewCard c where c.userId = :userId and c.state = :newState and c.suspended = false")
//     long countNewAvailable(@Param("userId") Long userId, @Param("newState") CardState newState);
//
//     /**
//      * Số thẻ mới đã được đưa vào học trong khoảng thời gian (một ngày địa phương của người học).
//      * Dùng để giới hạn số thẻ mới mỗi ngày.
//      */
//     @Query("""
//             select count(c) from ReviewCard c
//             where c.userId = :userId and c.state <> :newState
//               and c.lastReviewedAt >= :from and c.lastReviewedAt < :to
//               and c.reps = 1
//             """)
//     long countIntroducedBetween(@Param("userId") Long userId,
//                                 @Param("from") Instant from,
//                                 @Param("to") Instant to,
//                                 @Param("newState") CardState newState);
//
//     long countByUserIdAndItemTypeAndState(Long userId, ItemType itemType, CardState state);
//
//     @Query("""
//             select count(c) from ReviewCard c
//             where c.userId = :userId and c.itemType = :itemType and c.state = :state
//               and c.stability >= :minStability
//             """)
//     long countMastered(@Param("userId") Long userId,
//                        @Param("itemType") ItemType itemType,
//                        @Param("state") CardState state,
//                        @Param("minStability") double minStability);
//
//     @Query("""
//             select count(c) from ReviewCard c
//             where c.userId = :userId and c.itemType = :itemType and c.state = :state
//               and c.itemId in (
//                   select k.id from KanaCharacter k where k.script = :script and k.kanaGroup = :kanaGroup
//               )
//             """)
//     long countMasteredKana(@Param("userId") Long userId,
//                            @Param("itemType") ItemType itemType,
//                            @Param("state") CardState state,
//                            @Param("script") Script script,
//                            @Param("kanaGroup") KanaGroup kanaGroup);
//
//     @Query("""
//             select count(c) from ReviewCard c
//             where c.userId = :userId and c.itemType in :types and c.state <> :newState
//             """)
//     long countStarted(@Param("userId") Long userId,
//                       @Param("types") Collection<ItemType> types,
//                       @Param("newState") CardState newState);
// }
