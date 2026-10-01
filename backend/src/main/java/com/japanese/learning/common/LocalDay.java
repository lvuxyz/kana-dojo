// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.common;
//
// import java.time.Instant;
// import java.time.LocalDate;
// import java.time.ZoneId;
//
// /**
//  * Một ngày theo múi giờ của người học, kèm hai mốc Instant chặn đầu và cuối.
//  *
//  * <p>Mọi phép đếm "trong ngày hôm nay" (hạn mức, streak, mục tiêu XP) phải đi qua đây.
//  * Dùng UTC sẽ khiến người học ở Việt Nam mất streak lúc 7 giờ sáng.
//  */
// public record LocalDay(LocalDate date, Instant start, Instant endExclusive) {
//
//     public static LocalDay of(ZoneId zone, Instant moment) {
//         LocalDate date = moment.atZone(zone).toLocalDate();
//         return new LocalDay(date,
//                 date.atStartOfDay(zone).toInstant(),
//                 date.plusDays(1).atStartOfDay(zone).toInstant());
//     }
//
//     public static LocalDay today(ZoneId zone) {
//         return of(zone, Instant.now());
//     }
// }
