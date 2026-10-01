// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.web.dto;
//
// import com.japanese.learning.domain.enums.ItemType;
// import com.japanese.learning.domain.enums.KanaGroup;
// import com.japanese.learning.domain.enums.Script;
//
// import java.util.List;
//
// /** DTO của kho nội dung: bảng chữ kana, từ vựng, bộ thẻ. */
// public final class ContentDtos {
//
//     private ContentDtos() {
//     }
//
//     /** Danh sách kana cố tình KHÔNG kèm dữ liệu nét để phản hồi nhẹ. */
//     public record KanaCharacterDto(Long id,
//                                    String character,
//                                    String romaji,
//                                    Script script,
//                                    KanaGroup group,
//                                    String rowKey,
//                                    int colIndex,
//                                    int strokeCount,
//                                    String readingVi,
//                                    int displayOrder) {
//     }
//
//     public record KanaGlyphDto(String glyph,
//                                List<String> strokePaths,
//                                int strokeCount) {
//     }
//
//     public record KanaCharacterDetailDto(Long id,
//                                          String character,
//                                          String romaji,
//                                          Script script,
//                                          KanaGroup group,
//                                          String rowKey,
//                                          int colIndex,
//                                          int strokeCount,
//                                          String readingVi,
//                                          int displayOrder,
//                                          int viewBox,
//                                          List<KanaGlyphDto> glyphs) {
//     }
//
//     public record KanaStrokesDto(int viewBox, List<KanaGlyphDto> glyphs) {
//     }
//
//     public record VocabularyDto(Long id,
//                                 String word,
//                                 String reading,
//                                 String romaji,
//                                 String meaningVi,
//                                 String meaningEn,
//                                 Short jlptLevel,
//                                 String partOfSpeech,
//                                 String exampleJa,
//                                 String exampleVi,
//                                 String audioUrl) {
//     }
//
//     public record DeckDto(Long id,
//                           String name,
//                           String description,
//                           boolean isPublic,
//                           Short jlptLevel,
//                           ItemType itemType,
//                           int itemCount) {
//     }
// }
