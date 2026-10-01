// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.repository;
//
// import com.japanese.learning.domain.entity.KanaCharacter;
// import com.japanese.learning.domain.enums.KanaGroup;
// import com.japanese.learning.domain.enums.Script;
// import org.springframework.data.jpa.repository.JpaRepository;
// import org.springframework.data.jpa.repository.Query;
// import org.springframework.data.repository.query.Param;
// import org.springframework.stereotype.Repository;
//
// import java.util.List;
//
// @Repository
// public interface KanaCharacterRepository extends JpaRepository<KanaCharacter, Long> {
//
//     List<KanaCharacter> findAllByOrderByDisplayOrderAsc();
//
//     List<KanaCharacter> findByScriptOrderByDisplayOrderAsc(Script script);
//
//     List<KanaCharacter> findByScriptAndKanaGroupOrderByDisplayOrderAsc(Script script, KanaGroup kanaGroup);
//
//     List<KanaCharacter> findByKanaGroupOrderByDisplayOrderAsc(KanaGroup kanaGroup);
//
//     long countByScriptAndKanaGroup(Script script, KanaGroup kanaGroup);
//
//     /** Danh sách id ký tự chưa có thẻ ôn, theo đúng thứ tự dạy học. */
//     @Query("""
//             select k.id from KanaCharacter k
//             where k.id not in (
//                 select c.itemId from ReviewCard c
//                 where c.userId = :userId and c.itemType = :itemType
//             )
//             order by k.displayOrder asc
//             """)
//     List<Long> findIdsWithoutCard(@Param("userId") Long userId,
//                                   @Param("itemType") com.japanese.learning.domain.enums.ItemType itemType);
//
//     @Query("select k.id from KanaCharacter k where k.script = :script and k.kanaGroup = :kanaGroup order by k.displayOrder asc")
//     List<Long> findIdsByScriptAndGroup(@Param("script") Script script, @Param("kanaGroup") KanaGroup kanaGroup);
// }
