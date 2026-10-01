// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.common;
//
// import org.springframework.data.domain.Page;
//
// import java.util.List;
// import java.util.function.Function;
//
// /** Bao phân trang theo đúng hợp đồng API, không lộ cấu trúc nội bộ của Spring Data. */
// public record PageResponse<T>(List<T> content,
//                               int page,
//                               int size,
//                               long totalElements,
//                               int totalPages) {
//
//     public static <E, T> PageResponse<T> of(Page<E> source, Function<E, T> mapper) {
//         return new PageResponse<>(
//                 source.getContent().stream().map(mapper).toList(),
//                 source.getNumber(),
//                 source.getSize(),
//                 source.getTotalElements(),
//                 source.getTotalPages());
//     }
// }
