// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.service;
//
// import com.japanese.learning.common.PageResponse;
// import com.japanese.learning.domain.entity.Vocabulary;
// import com.japanese.learning.domain.enums.PlanCode;
// import com.japanese.learning.repository.VocabularyRepository;
// import com.japanese.learning.web.dto.ContentDtos.VocabularyDto;
// import jakarta.persistence.criteria.Expression;
// import jakarta.persistence.criteria.Path;
// import jakarta.persistence.criteria.Predicate;
// import lombok.RequiredArgsConstructor;
// import org.springframework.data.domain.Pageable;
// import org.springframework.data.jpa.domain.Specification;
// import org.springframework.stereotype.Service;
// import org.springframework.transaction.annotation.Transactional;
//
// import java.util.ArrayList;
// import java.util.List;
//
// /** Tra cứu từ vựng có phân trang, tôn trọng giới hạn cấp JLPT của gói cước. */
// @Service
// @RequiredArgsConstructor
// public class VocabularyService {
//
//     private final VocabularyRepository vocabularyRepository;
//     private final EntitlementService entitlementService;
//
//     @Transactional(readOnly = true)
//     public PageResponse<VocabularyDto> search(PlanCode plan, Short level, String keyword, Pageable pageable) {
//         int minLevel = entitlementService.minJlptLevel(plan);
//         return PageResponse.of(
//                 vocabularyRepository.findAll(specification(level, keyword, minLevel), pageable),
//                 VocabularyService::toDto);
//     }
//
//     /**
//      * Bộ lọc: cấp JLPT được phép theo gói, cấp cụ thể nếu client chỉ định,
//      * và tìm kiếm không phân biệt hoa thường trên từ, cách đọc, romaji và nghĩa.
//      */
//     private Specification<Vocabulary> specification(Short level, String keyword, int minLevel) {
//         return (root, query, cb) -> {
//             List<Predicate> predicates = new ArrayList<>();
//
//             Path<Short> levelPath = root.get("jlptLevel");
//             // Cấp JLPT càng nhỏ càng khó; gói FREE bị chặn ở 5 nên chỉ thấy N5.
//             predicates.add(cb.or(cb.isNull(levelPath),
//                     cb.greaterThanOrEqualTo(levelPath, (short) minLevel)));
//
//             if (level != null) {
//                 predicates.add(cb.equal(levelPath, level));
//             }
//             if (keyword != null && !keyword.isBlank()) {
//                 String like = "%" + keyword.trim().toLowerCase() + "%";
//                 Expression<String> word = root.get("word");
//                 Expression<String> reading = root.get("reading");
//                 Expression<String> romaji = root.get("romaji");
//                 Expression<String> meaningVi = root.get("meaningVi");
//                 predicates.add(cb.or(
//                         cb.like(cb.lower(word), like),
//                         cb.like(cb.lower(reading), like),
//                         cb.like(cb.lower(romaji), like),
//                         cb.like(cb.lower(meaningVi), like)));
//             }
//             return cb.and(predicates.toArray(new Predicate[0]));
//         };
//     }
//
//     static VocabularyDto toDto(Vocabulary vocabulary) {
//         return new VocabularyDto(
//                 vocabulary.getId(),
//                 vocabulary.getWord(),
//                 vocabulary.getReading(),
//                 vocabulary.getRomaji(),
//                 vocabulary.getMeaningVi(),
//                 vocabulary.getMeaningEn(),
//                 vocabulary.getJlptLevel(),
//                 vocabulary.getPartOfSpeech(),
//                 vocabulary.getExampleJa(),
//                 vocabulary.getExampleVi(),
//                 vocabulary.getAudioUrl());
//     }
// }
