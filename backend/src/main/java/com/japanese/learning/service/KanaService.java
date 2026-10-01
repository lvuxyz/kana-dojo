// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.service;
//
// import com.japanese.learning.common.ApiException;
// import com.japanese.learning.domain.entity.KanaCharacter;
// import com.japanese.learning.domain.entity.KanaGlyph;
// import com.japanese.learning.domain.enums.KanaGroup;
// import com.japanese.learning.domain.enums.Script;
// import com.japanese.learning.repository.KanaCharacterRepository;
// import com.japanese.learning.repository.KanaGlyphRepository;
// import com.japanese.learning.web.dto.ContentDtos.KanaCharacterDetailDto;
// import com.japanese.learning.web.dto.ContentDtos.KanaCharacterDto;
// import com.japanese.learning.web.dto.ContentDtos.KanaGlyphDto;
// import com.japanese.learning.web.dto.ContentDtos.KanaStrokesDto;
// import lombok.RequiredArgsConstructor;
// import org.springframework.stereotype.Service;
// import org.springframework.transaction.annotation.Transactional;
//
// import java.nio.charset.StandardCharsets;
// import java.security.MessageDigest;
// import java.security.NoSuchAlgorithmException;
// import java.util.ArrayList;
// import java.util.HexFormat;
// import java.util.List;
// import java.util.Map;
// import java.util.concurrent.atomic.AtomicReference;
// import java.util.function.Function;
// import java.util.stream.Collectors;
//
// /** Tra cứu bảng chữ kana và dữ liệu nét viết. */
// @Service
// @RequiredArgsConstructor
// public class KanaService {
//
//     private static final int DEFAULT_VIEW_BOX = 109;
//
//     private final KanaCharacterRepository kanaCharacterRepository;
//     private final KanaGlyphRepository kanaGlyphRepository;
//
//     /**
//      * ETag của gói nét được tính một lần rồi giữ lại: dữ liệu này bất biến sau khi seed,
//      * nên không có lý do gì băm lại 148 glyph ở mỗi request.
//      */
//     private final AtomicReference<String> strokesEtag = new AtomicReference<>();
//
//     @Transactional(readOnly = true)
//     public List<KanaCharacterDto> list(Script script, KanaGroup group) {
//         List<KanaCharacter> characters;
//         if (script != null && group != null) {
//             characters = kanaCharacterRepository.findByScriptAndKanaGroupOrderByDisplayOrderAsc(script, group);
//         } else if (script != null) {
//             characters = kanaCharacterRepository.findByScriptOrderByDisplayOrderAsc(script);
//         } else if (group != null) {
//             characters = kanaCharacterRepository.findByKanaGroupOrderByDisplayOrderAsc(group);
//         } else {
//             characters = kanaCharacterRepository.findAllByOrderByDisplayOrderAsc();
//         }
//         return characters.stream().map(KanaService::toDto).toList();
//     }
//
//     @Transactional(readOnly = true)
//     public KanaCharacterDetailDto detail(Long id) {
//         KanaCharacter character = kanaCharacterRepository.findById(id)
//                 .orElseThrow(() -> ApiException.notFound("Không tìm thấy ký tự kana với id " + id));
//
//         List<String> glyphKeys = splitGlyphs(character.getGlyphSequence());
//         Map<String, KanaGlyph> glyphs = kanaGlyphRepository.findAllById(glyphKeys).stream()
//                 .collect(Collectors.toMap(KanaGlyph::getGlyph, Function.identity()));
//
//         List<KanaGlyphDto> ordered = new ArrayList<>(glyphKeys.size());
//         int viewBox = DEFAULT_VIEW_BOX;
//         for (String key : glyphKeys) {
//             KanaGlyph glyph = glyphs.get(key);
//             if (glyph == null) {
//                 continue;
//             }
//             viewBox = glyph.getViewBox();
//             ordered.add(new KanaGlyphDto(glyph.getGlyph(), glyph.getStrokePaths(), glyph.getStrokeCount()));
//         }
//
//         return new KanaCharacterDetailDto(
//                 character.getId(),
//                 character.getCharacter(),
//                 character.getRomaji(),
//                 character.getScript(),
//                 character.getKanaGroup(),
//                 character.getRowKey(),
//                 character.getColIndex(),
//                 character.getStrokeCount(),
//                 character.getReadingVi(),
//                 character.getDisplayOrder(),
//                 viewBox,
//                 ordered);
//     }
//
//     /** Toàn bộ glyph để client tải một lần rồi cache vĩnh viễn. */
//     @Transactional(readOnly = true)
//     public KanaStrokesDto allStrokes() {
//         List<KanaGlyph> glyphs = kanaGlyphRepository.findAllByOrderByGlyphAsc();
//         int viewBox = glyphs.isEmpty() ? DEFAULT_VIEW_BOX : glyphs.get(0).getViewBox();
//         return new KanaStrokesDto(viewBox, glyphs.stream()
//                 .map(glyph -> new KanaGlyphDto(glyph.getGlyph(), glyph.getStrokePaths(), glyph.getStrokeCount()))
//                 .toList());
//     }
//
//     /** ETag mạnh dựa trên nội dung thật của gói nét. */
//     @Transactional(readOnly = true)
//     public String strokesEtag() {
//         String cached = strokesEtag.get();
//         if (cached != null) {
//             return cached;
//         }
//         StringBuilder builder = new StringBuilder();
//         for (KanaGlyph glyph : kanaGlyphRepository.findAllByOrderByGlyphAsc()) {
//             builder.append(glyph.getGlyph()).append(':').append(glyph.getStrokeCount()).append(';');
//             glyph.getStrokePaths().forEach(path -> builder.append(path).append('|'));
//         }
//         String etag = "\"kana-strokes-" + sha256Short(builder.toString()) + "\"";
//         strokesEtag.compareAndSet(null, etag);
//         return strokesEtag.get();
//     }
//
//     /** Xoá ETag đã nhớ khi dữ liệu nét thay đổi (chỉ xảy ra lúc seed). */
//     public void invalidateStrokesEtag() {
//         strokesEtag.set(null);
//     }
//
//     /** Tách chuỗi glyph theo code point để ký tự ngoài BMP cũng đúng. */
//     static List<String> splitGlyphs(String glyphSequence) {
//         return glyphSequence.codePoints()
//                 .mapToObj(Character::toString)
//                 .toList();
//     }
//
//     static KanaCharacterDto toDto(KanaCharacter character) {
//         return new KanaCharacterDto(
//                 character.getId(),
//                 character.getCharacter(),
//                 character.getRomaji(),
//                 character.getScript(),
//                 character.getKanaGroup(),
//                 character.getRowKey(),
//                 character.getColIndex(),
//                 character.getStrokeCount(),
//                 character.getReadingVi(),
//                 character.getDisplayOrder());
//     }
//
//     private String sha256Short(String value) {
//         try {
//             byte[] hash = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
//             return HexFormat.of().formatHex(hash).substring(0, 16);
//         } catch (NoSuchAlgorithmException ex) {
//             throw new IllegalStateException("JVM không hỗ trợ SHA-256", ex);
//         }
//     }
// }
