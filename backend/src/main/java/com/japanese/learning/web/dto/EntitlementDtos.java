// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.web.dto;
//
// import com.fasterxml.jackson.annotation.JsonInclude;
// import com.japanese.learning.domain.enums.PlanCode;
//
// import java.util.Map;
//
// public final class EntitlementDtos {
//
//     private EntitlementDtos() {
//     }
//
//     /**
//      * Hạn mức và mức đã dùng trong ngày.
//      * Giá trị null trong {@code features} nghĩa là không giới hạn.
//      */
//     public record EntitlementsDto(PlanCode plan,
//                                   @JsonInclude(JsonInclude.Include.ALWAYS)
//                                   Map<String, Integer> features,
//                                   Map<String, Long> usage) {
//     }
// }
