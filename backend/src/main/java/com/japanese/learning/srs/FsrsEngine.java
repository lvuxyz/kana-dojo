// ĐANG TẮT — web chạy ở chế độ cá nhân, không dùng server (docs/LOCAL_MODE.md).
// Mã gốc được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// `.
// Bật lại: xoá 4 dòng ghi chú này và bỏ tiền tố `// ` ở mọi dòng còn lại.
// [máy chủ — đang tắt]
// package com.japanese.learning.srs;
//
// import com.japanese.learning.domain.enums.CardState;
//
// import java.time.Duration;
// import java.time.Instant;
//
// /**
//  * Cài đặt FSRS-6 (Free Spaced Repetition Scheduler).
//  *
//  * <p>Lớp thuần hàm: không state, không phụ thuộc Spring, mọi phương thức đều là {@code static}.
//  * Toàn bộ lịch ôn của ứng dụng đi qua đây nên nó phải kiểm thử được độc lập với CSDL.
//  *
//  * <p>Ý đồ chung: mỗi thẻ được mô tả bằng hai đại lượng liên tục
//  * <ul>
//  *   <li><b>S (stability)</b> — số ngày để khả năng nhớ lại tụt xuống mức mục tiêu 90%.</li>
//  *   <li><b>D (difficulty)</b> — độ khó riêng của thẻ với người học này, giữ trong [1, 10].</li>
//  * </ul>
//  * Khoảng cách ôn kế tiếp được suy ra từ S sao cho đúng lúc ôn thì R(t, S) rơi về
//  * {@code desiredRetention}. Vì vậy toàn bộ "trí thông minh" của bộ lập lịch nằm ở cách cập nhật S và D.
//  */
// public final class FsrsEngine {
//
//     /** 21 tham số mặc định của FSRS-6. Chỉ số trong công thức bên dưới trùng với chỉ số mảng. */
//     static final double[] W = {
//             0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001,
//             1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014,
//             1.8729, 0.5425, 0.0912, 0.0658, 0.1542
//     };
//
//     /** Số mũ của đường cong quên. Âm, nên R giảm đơn điệu theo t. */
//     static final double DECAY = -W[20];
//
//     /**
//      * Hằng chuẩn hoá để R(S, S) = 0.9: giải (1 + factor)^decay = 0.9.
//      * Nhờ nó, "stability = S ngày" luôn có nghĩa là "sau S ngày còn nhớ 90%".
//      */
//     static final double FACTOR = Math.pow(0.9, 1.0 / DECAY) - 1.0;
//
//     /** Các mốc phút của giai đoạn học lần đầu. */
//     static final int[] LEARNING_STEPS_MINUTES = {1, 10};
//
//     /** Mốc phút khi thẻ bị quên và phải học lại. */
//     static final int[] RELEARNING_STEPS_MINUTES = {10};
//
//     public static final double DEFAULT_DESIRED_RETENTION = 0.90;
//
//     private static final double MIN_STABILITY = 0.01;
//     private static final double MIN_DIFFICULTY = 1.0;
//     private static final double MAX_DIFFICULTY = 10.0;
//     private static final int MAX_INTERVAL_DAYS = 36500;
//
//     private FsrsEngine() {
//     }
//
//     /** Trạng thái FSRS của một thẻ, đủ để tính bước kế tiếp mà không cần đọc lịch sử. */
//     public record FsrsState(double stability,
//                             double difficulty,
//                             CardState state,
//                             int learningStep,
//                             int reps,
//                             int lapses) {
//
//         /** Trạng thái khởi đầu của một thẻ chưa từng được ôn. */
//         public static FsrsState newCard() {
//             return new FsrsState(0.0, 0.0, CardState.NEW, 0, 0, 0);
//         }
//     }
//
//     /**
//      * Kết quả một lần chấm.
//      *
//      * @param intervalDays khoảng cách tính theo ngày; bằng 0 khi thẻ còn nằm trong các bước học
//      *                     dưới một ngày (lúc đó {@code dueAt} mới là thông tin chính xác).
//      */
//     public record FsrsResult(FsrsState next, int intervalDays, Instant dueAt) {
//     }
//
//     // ------------------------------------------------------------------
//     // Công thức cơ bản
//     // ------------------------------------------------------------------
//
//     /**
//      * Khả năng nhớ lại sau {@code elapsedDays} ngày: R(t, S) = (1 + FACTOR * t / S)^DECAY.
//      *
//      * <p>Luôn nằm trong khoảng (0, 1]: bằng 1 khi t = 0 và giảm ngặt theo t.
//      * S được kẹp dưới ở {@link #MIN_STABILITY} vì S = 0 sẽ làm phép chia nổ.
//      */
//     public static double retrievability(double stability, double elapsedDays) {
//         double s = Math.max(stability, MIN_STABILITY);
//         double t = Math.max(elapsedDays, 0.0);
//         return Math.pow(1.0 + FACTOR * t / s, DECAY);
//     }
//
//     /**
//      * Quy điểm chấm nét viết (0..100) thành grade FSRS.
//      *
//      * <p>Đây là điểm khác biệt của sản phẩm: grade được <i>đo</i> từ chất lượng nét viết
//      * thay vì để người học tự khai báo, nên dữ liệu huấn luyện lại tham số về sau ít nhiễu hơn.
//      * Một nét sai hẳn (sai thứ tự, ngược chiều...) là đủ để coi như quên, bất kể điểm trung bình.
//      */
//     public static int gradeFromScore(int score, boolean anyStrokeFailed) {
//         if (anyStrokeFailed || score < 48) {
//             return 1;
//         }
//         if (score < 70) {
//             return 2;
//         }
//         if (score < 88) {
//             return 3;
//         }
//         return 4;
//     }
//
//     /** Khoảng cách ôn (ngày) suy ra từ S sao cho khi đến hạn thì R vừa chạm mức mong muốn. */
//     public static int intervalDays(double stability, double desiredRetention) {
//         double retention = clamp(desiredRetention, 0.70, 0.99);
//         double raw = (Math.max(stability, MIN_STABILITY) / FACTOR)
//                 * (Math.pow(retention, 1.0 / DECAY) - 1.0);
//         long rounded = Math.round(raw);
//         return (int) clampLong(rounded, 1, MAX_INTERVAL_DAYS);
//     }
//
//     // ------------------------------------------------------------------
//     // Khởi tạo S, D cho lần ôn đầu tiên
//     // ------------------------------------------------------------------
//
//     static double initialStability(int grade) {
//         return Math.max(W[grade - 1], MIN_STABILITY);
//     }
//
//     static double initialDifficulty(int grade) {
//         return clamp(W[4] - Math.exp(W[5] * (grade - 1)) + 1.0, MIN_DIFFICULTY, MAX_DIFFICULTY);
//     }
//
//     // ------------------------------------------------------------------
//     // Cập nhật D và S
//     // ------------------------------------------------------------------
//
//     /**
//      * Cập nhật độ khó có hồi quy về trung bình.
//      *
//      * <p>Phần {@code deltaD} là phản ứng tức thời với câu trả lời; phần trộn với
//      * {@code initialDifficulty(4)} (trọng số w7) kéo D dần về mức "dễ" theo thời gian.
//      * Không có bước hồi quy này, D chỉ biết tăng và mọi thẻ cuối cùng đều dính trần 10.
//      */
//     static double nextDifficulty(double difficulty, int grade) {
//         double deltaD = -W[6] * (grade - 3);
//         double dampened = difficulty + deltaD * (10.0 - difficulty) / 9.0;
//         double reverted = W[7] * initialDifficulty(4) + (1.0 - W[7]) * dampened;
//         return clamp(reverted, MIN_DIFFICULTY, MAX_DIFFICULTY);
//     }
//
//     /** S khi nhớ được (grade >= 2): S tăng nhiều nhất khi R thấp — ôn đúng lúc sắp quên là hiệu quả nhất. */
//     static double stabilityAfterRecall(double stability, double difficulty, double retrievability, int grade) {
//         double s = Math.max(stability, MIN_STABILITY);
//         double hardPenalty = (grade == 2) ? W[15] : 1.0;
//         double easyBonus = (grade == 4) ? W[16] : 1.0;
//         double growth = Math.exp(W[8])
//                 * (11.0 - difficulty)
//                 * Math.pow(s, -W[9])
//                 * (Math.exp(W[10] * (1.0 - retrievability)) - 1.0)
//                 * hardPenalty
//                 * easyBonus;
//         return Math.max(s * (1.0 + growth), MIN_STABILITY);
//     }
//
//     /**
//      * S khi quên (grade = 1). Lấy {@code min} với S cũ để bảo đảm một lần quên
//      * không bao giờ làm thẻ "khoẻ" lên — đây là bẫy hay gặp khi S cũ còn rất nhỏ.
//      */
//     static double stabilityAfterForget(double stability, double difficulty, double retrievability) {
//         double s = Math.max(stability, MIN_STABILITY);
//         double d = Math.max(difficulty, MIN_DIFFICULTY);
//         double postLapse = W[11]
//                 * Math.pow(d, -W[12])
//                 * (Math.pow(s + 1.0, W[13]) - 1.0)
//                 * Math.exp(W[14] * (1.0 - retrievability));
//         return Math.max(Math.min(s, postLapse), MIN_STABILITY);
//     }
//
//     /**
//      * S cho lần ôn lại trong cùng ngày: không dùng đường cong quên vì t ~ 0 khiến R ~ 1
//      * và công thức nhớ lại sẽ gần như không tăng S. Công thức ngắn hạn này thay thế.
//      */
//     static double stabilityShortTerm(double stability, int grade) {
//         double s = Math.max(stability, MIN_STABILITY);
//         double next = s * Math.exp(W[17] * (grade - 3 + W[18])) * Math.pow(s, -W[19]);
//         return Math.max(next, MIN_STABILITY);
//     }
//
//     // ------------------------------------------------------------------
//     // Điểm vào chính
//     // ------------------------------------------------------------------
//
//     /**
//      * Chấm một thẻ và trả về trạng thái + lịch ôn kế tiếp.
//      *
//      * @param cur              trạng thái hiện tại của thẻ
//      * @param grade            1 = Again, 2 = Hard, 3 = Good, 4 = Easy
//      * @param elapsedDays      số ngày <i>thực tế</i> đã trôi kể từ lần ôn trước (có phần thập phân);
//      *                         phải là thời gian thật, không phải số ngày đã lên lịch
//      * @param now              mốc thời gian của lần chấm này
//      * @param desiredRetention mức nhớ mục tiêu, mặc định 0.90
//      */
//     public static FsrsResult review(FsrsState cur, int grade, double elapsedDays, Instant now, double desiredRetention) {
//         if (grade < 1 || grade > 4) {
//             throw new IllegalArgumentException("grade phải nằm trong khoảng 1..4, nhận được: " + grade);
//         }
//         if (cur == null || now == null) {
//             throw new IllegalArgumentException("Trạng thái thẻ và thời điểm chấm không được null");
//         }
//
//         double elapsed = Math.max(elapsedDays, 0.0);
//         int reps = cur.reps() + 1;
//
//         double stability;
//         double difficulty;
//
//         if (cur.state() == CardState.NEW || cur.reps() == 0) {
//             // Lần đầu tiên: S, D được khởi tạo thẳng từ tham số, không có lịch sử để dựa vào.
//             stability = initialStability(grade);
//             difficulty = initialDifficulty(grade);
//         } else {
//             double r = retrievability(cur.stability(), elapsed);
//             difficulty = nextDifficulty(cur.difficulty(), grade);
//             if (grade == 1) {
//                 stability = stabilityAfterForget(cur.stability(), cur.difficulty(), r);
//             } else if (elapsed < 1.0) {
//                 // Ôn lại trong cùng ngày (điển hình là các bước học cách nhau vài phút).
//                 stability = stabilityShortTerm(cur.stability(), grade);
//             } else {
//                 stability = stabilityAfterRecall(cur.stability(), cur.difficulty(), r, grade);
//             }
//         }
//
//         // Chỉ tính là "quên" khi thẻ đã tốt nghiệp. Sai lúc đang học (LEARNING/RELEARNING)
//         // là chuyện bình thường của quá trình học, đếm vào lapses sẽ thổi phồng độ khó.
//         int lapses = (grade == 1 && cur.state() == CardState.REVIEW) ? cur.lapses() + 1 : cur.lapses();
//
//         return switch (cur.state()) {
//             case NEW, LEARNING -> scheduleThroughSteps(
//                     LEARNING_STEPS_MINUTES, CardState.LEARNING,
//                     cur.learningStep(), grade, stability, difficulty, reps, lapses, now, desiredRetention);
//             case RELEARNING -> scheduleThroughSteps(
//                     RELEARNING_STEPS_MINUTES, CardState.RELEARNING,
//                     cur.learningStep(), grade, stability, difficulty, reps, lapses, now, desiredRetention);
//             case REVIEW -> {
//                 if (grade == 1) {
//                     // Quên một thẻ đã thuộc: rơi về RELEARNING, quay lại mốc phút đầu tiên.
//                     yield new FsrsResult(
//                             new FsrsState(stability, difficulty, CardState.RELEARNING, 0, reps, lapses),
//                             0,
//                             now.plus(Duration.ofMinutes(RELEARNING_STEPS_MINUTES[0])));
//                 }
//                 yield graduate(stability, difficulty, reps, lapses, now, desiredRetention);
//             }
//         };
//     }
//
//     /** Quá tải tiện dụng dùng mức nhớ mục tiêu mặc định 0.90. */
//     public static FsrsResult review(FsrsState cur, int grade, double elapsedDays, Instant now) {
//         return review(cur, grade, elapsedDays, now, DEFAULT_DESIRED_RETENTION);
//     }
//
//     /**
//      * Máy trạng thái của các bước học tính bằng phút.
//      *
//      * <ul>
//      *   <li>Again → quay về bước 0.</li>
//      *   <li>Hard → lặp lại chính bước hiện tại.</li>
//      *   <li>Good → sang bước kế; hết bước thì tốt nghiệp sang REVIEW và bắt đầu dùng FSRS.</li>
//      *   <li>Easy → tốt nghiệp ngay, bỏ qua các bước còn lại.</li>
//      * </ul>
//      */
//     private static FsrsResult scheduleThroughSteps(int[] steps,
//                                                    CardState stepState,
//                                                    int currentStep,
//                                                    int grade,
//                                                    double stability,
//                                                    double difficulty,
//                                                    int reps,
//                                                    int lapses,
//                                                    Instant now,
//                                                    double desiredRetention) {
//         if (grade == 4) {
//             return graduate(stability, difficulty, reps, lapses, now, desiredRetention);
//         }
//
//         int step = switch (grade) {
//             case 1 -> 0;
//             case 2 -> Math.min(Math.max(currentStep, 0), steps.length - 1);
//             default -> Math.max(currentStep, 0) + 1;
//         };
//
//         if (step >= steps.length) {
//             return graduate(stability, difficulty, reps, lapses, now, desiredRetention);
//         }
//         return new FsrsResult(
//                 new FsrsState(stability, difficulty, stepState, step, reps, lapses),
//                 0,
//                 now.plus(Duration.ofMinutes(steps[step])));
//     }
//
//     private static FsrsResult graduate(double stability,
//                                        double difficulty,
//                                        int reps,
//                                        int lapses,
//                                        Instant now,
//                                        double desiredRetention) {
//         int interval = intervalDays(stability, desiredRetention);
//         return new FsrsResult(
//                 new FsrsState(stability, difficulty, CardState.REVIEW, 0, reps, lapses),
//                 interval,
//                 now.plus(Duration.ofDays(interval)));
//     }
//
//     private static double clamp(double value, double min, double max) {
//         return Math.min(Math.max(value, min), max);
//     }
//
//     private static long clampLong(long value, long min, long max) {
//         return Math.min(Math.max(value, min), max);
//     }
// }
