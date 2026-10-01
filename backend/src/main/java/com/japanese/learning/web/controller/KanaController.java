// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.web.controller;
//
// import com.japanese.learning.domain.enums.KanaGroup;
// import com.japanese.learning.domain.enums.Script;
// import com.japanese.learning.service.KanaService;
// import com.japanese.learning.web.dto.ContentDtos.KanaCharacterDetailDto;
// import com.japanese.learning.web.dto.ContentDtos.KanaCharacterDto;
// import com.japanese.learning.web.dto.ContentDtos.KanaStrokesDto;
// import io.swagger.v3.oas.annotations.Operation;
// import io.swagger.v3.oas.annotations.tags.Tag;
// import lombok.RequiredArgsConstructor;
// import org.springframework.http.CacheControl;
// import org.springframework.http.HttpStatus;
// import org.springframework.http.ResponseEntity;
// import org.springframework.web.bind.annotation.GetMapping;
// import org.springframework.web.bind.annotation.PathVariable;
// import org.springframework.web.bind.annotation.RequestHeader;
// import org.springframework.web.bind.annotation.RequestMapping;
// import org.springframework.web.bind.annotation.RequestParam;
// import org.springframework.web.bind.annotation.RestController;
//
// import java.time.Duration;
// import java.util.List;
//
// @Tag(name = "Kana", description = "Bảng chữ kana và dữ liệu nét viết")
// @RestController
// @RequestMapping("/api/v1/kana")
// @RequiredArgsConstructor
// public class KanaController {
//
//     private final KanaService kanaService;
//
//     @Operation(summary = "Danh sách ký tự kana (không kèm dữ liệu nét)")
//     @GetMapping
//     public List<KanaCharacterDto> list(@RequestParam(required = false) Script script,
//                                        @RequestParam(name = "group", required = false) KanaGroup group) {
//         return kanaService.list(script, group);
//     }
//
//     /**
//      * Gói nét của toàn bộ 148 glyph. Dữ liệu bất biến nên đặt cache một năm và
//      * kèm ETag để client kiểm tra lại gần như miễn phí sau khi cache hết hạn.
//      * Khai báo trước {@code /{id}} để "strokes" không bị hiểu là một id.
//      */
//     @Operation(summary = "Toàn bộ dữ liệu nét của 148 glyph")
//     @GetMapping("/strokes")
//     public ResponseEntity<KanaStrokesDto> strokes(
//             @RequestHeader(value = "If-None-Match", required = false) String ifNoneMatch) {
//         String etag = kanaService.strokesEtag();
//         CacheControl cacheControl = CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable();
//
//         if (etag.equals(ifNoneMatch)) {
//             return ResponseEntity.status(HttpStatus.NOT_MODIFIED)
//                     .eTag(etag)
//                     .cacheControl(cacheControl)
//                     .build();
//         }
//         return ResponseEntity.ok()
//                 .eTag(etag)
//                 .cacheControl(cacheControl)
//                 .body(kanaService.allStrokes());
//     }
//
//     @Operation(summary = "Chi tiết một ký tự kèm dữ liệu nét của từng glyph")
//     @GetMapping("/{id}")
//     public KanaCharacterDetailDto detail(@PathVariable Long id) {
//         return kanaService.detail(id);
//     }
// }
