// ĐANG TẮT — đồng bộ luyện gõ lên máy chủ (lưu kỷ lục, cộng XP/streak theo tài khoản).
// Phòng luyện gõ hiện chạy hoàn toàn trên máy người dùng (localStorage), nên mã này được giữ lại dưới dạng
// comment. Cách bật lại: docs/TYPING.md, mục "Mã đồng bộ máy chủ (đang tắt)".
//
// package com.japanese.learning.typing;
//
// import com.japanese.learning.domain.enums.TypingMode;
//
// /**
//  * Chấm điểm luyện gõ — hàm thuần, phải khớp tuyệt đối với {@code web/src/lib/typing/score.ts}.
//  *
//  * <p>Client chấm ngay để hiện kết quả, nhưng server không tin điểm client gửi lên: chỉ nhận số đo
//  * thô (phím đúng, phím sai, thời gian) rồi tính lại ở đây.
//  */
// public final class TypingScoring {
//
//     /**
//      * Trần tốc độ hợp lý. Kỷ lục gõ romaji của người Nhật vào khoảng 1.000 phím/phút;
//      * vượt xa ngưỡng này gần như chắc chắn là dữ liệu giả.
//      */
//     public static final double MAX_PLAUSIBLE_KPM = 1500;
//
//     public static final int XP_BASE = 5;
//     public static final int XP_KEYS_PER_POINT = 10;
//     public static final int XP_MAX = 50;
//     public static final int MIN_KEYS_FOR_XP = 20;
//
//     private TypingScoring() {
//     }
//
//     /**
//      * XP cho một lượt luyện gõ: tỉ lệ với số phím đúng (5 + 1 XP mỗi 10 phím, tối đa 50) để chia nhỏ
//      * lượt gõ không cày được thêm XP. Dưới 20 phím đúng thì chưa tính là một lượt luyện.
//      */
//     public static int xp(int correctKeys) {
//         if (correctKeys < MIN_KEYS_FOR_XP) {
//             return 0;
//         }
//         return Math.min(XP_MAX, XP_BASE + correctKeys / XP_KEYS_PER_POINT);
//     }
//
//     /** Phím đúng mỗi phút (打鍵/分). */
//     public static double kpm(int correctKeys, int durationMs) {
//         return durationMs > 0 ? correctKeys * 60_000.0 / durationMs : 0;
//     }
//
//     /** Tỉ lệ phím đúng; chưa gõ phím nào coi như tuyệt đối. */
//     public static double accuracy(int correctKeys, int missKeys) {
//         int total = correctKeys + missKeys;
//         return total == 0 ? 1.0 : (double) correctKeys / total;
//     }
//
//     /**
//      * Điểm = KPM × chính xác³ (cách của e-typing): gõ nhanh mà ẩu bị phạt nặng.
//      * Chế độ sinh tử đo độ bền nên điểm là số phím đúng liên tiếp trước khi sai.
//      */
//     public static int score(TypingMode mode, int correctKeys, int missKeys, int durationMs) {
//         if (mode == TypingMode.SUDDEN_DEATH) {
//             return correctKeys;
//         }
//         double acc = accuracy(correctKeys, missKeys);
//         return (int) Math.round(kpm(correctKeys, durationMs) * acc * acc * acc);
//     }
// }
