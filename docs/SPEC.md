# Kana Dōjō — Đặc tả kỹ thuật v2 (site tĩnh, không tài khoản)

Mọi con số, tên trường, khoá lưu trữ trong tài liệu này là **bắt buộc** — code và test dựa vào chúng.
v1 là bản có máy chủ Spring Boot + PostgreSQL + đăng nhập; v2 chuyển toàn bộ sang trình duyệt (xem [ARCHITECTURE.md](ARCHITECTURE.md)).
Các thuật toán (§3–§4) **giữ nguyên** so với v1.

---

## 0. Ngăn xếp công nghệ

| Tầng | Công nghệ | Ghi chú |
|---|---|---|
| Giao diện | Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4 | `output: "export"` — xuất bản tĩnh |
| Lưu trữ | `localStorage` (một khoá JSON) | không có máy chủ, không có CSDL |
| Kiểm tra dữ liệu | zod 3 | validate khi nạp và khi nhập tệp |
| Kiểm thử | Vitest | chạy trong Node, `localStorage` giả |

---

## 1. Nội dung tĩnh

Nằm trong `web/src/data/`, đóng gói vào bundle lúc build. Muốn đổi nội dung: sửa tệp rồi build lại.

| Tệp | Nội dung | Số lượng |
|---|---|---|
| `kana-data.json` | `viewBox` (109), `rowLabels`, `glyphs` (đường nét SVG theo glyph), `chars` (ký tự hiển thị) | 208 ký tự · 148 glyph |
| `vocabulary.ts` | `Vocabulary[]` — `id`, `word`, `reading`, `romaji`, `meaningVi`, `meaningEn`, `jlptLevel`, `partOfSpeech`, `exampleJa`, `exampleVi` | 80 (70 N5 + 10 N4) |
| `quizzes.ts` | `Quiz[]` — `id`, `title`, `description`, `quizType`, `jlptLevel`, `timeLimitSec`, `questions[]` | 4 quiz · 38 câu |
| `badges.ts` | `BadgeDef[]` — `code`, `nameVi`, `descriptionVi`, `icon`, `tier` | 9 |

**Bất biến:**

- `Vocabulary.id` là số nguyên liên tục từ 1. Thẻ ôn tham chiếu tới nó (`VOCAB_MEANING:12`) nên **không được đánh số lại hay xoá** — chỉ thêm vào cuối.
- Mã ký tự kana (`"あ"`, `"きゃ"`) là khoá của mọi thẻ kana, nên là duy nhất qua cả hai bảng chữ (Hiragana ≠ Katakana về mặt ký tự).
- Thứ tự phần tử trong `kana-data.json → chars` là **thứ tự dạy học**: Hiragana (cơ bản → biến âm → ghép) rồi Katakana.

Giá trị hợp lệ (kiểm bằng test `quiz.test.ts`):

| trường | giá trị |
|---|---|
| `Quiz.quizType` | `KANA_READING` \| `VOCAB_MEANING` \| `ROMAJI_INPUT` |
| `QuizQuestion.questionType` | `MULTIPLE_CHOICE` (`options` bắt buộc, chứa `correctAnswer`) \| `TEXT_INPUT` (`options = []`) |
| `Vocabulary.partOfSpeech` | `NOUN` \| `PRONOUN` \| `VERB` \| `I_ADJ` \| `NA_ADJ` \| `ADVERB` \| `EXPRESSION` |
| `BadgeDef.tier` | `BRONZE` \| `SILVER` \| `GOLD` |

---

## 2. Mô hình dữ liệu tiến độ

Khoá `localStorage`: **`kd.progress.v1`**. Giá trị là JSON của `ProgressState` (schema zod: `web/src/lib/learning/state.ts`). Thời gian là mili-giây epoch;
"ngày" là chuỗi `YYYY-MM-DD` theo múi giờ thiết bị.

```ts
interface ProgressState {
  version: 1;
  settings: { dailyGoalXp: number };            // 10..500, mặc định 50
  stats: {
    xpTotal: number;
    currentStreak: number; longestStreak: number;
    lastActiveDate: string | null;              // ngày gần nhất đạt mục tiêu
    streakFreezes: number;                      // 0..2
    freezeWeek: string | null;                  // Thứ Hai của tuần đã hồi thẻ băng gần nhất
    totalReviews: number; totalWritingMs: number;
  };
  daily: Record<string /*ngày*/, {              // tổng hợp theo ngày — nguồn của heatmap
    xp: number; reviews: number; chars: number; studyMs: number; goalMet: boolean;
  }>;
  cards: Record<string /*khoá thẻ*/, CardRecord>;
  writing: {
    best: Record<string /*ký tự*/, number>;     // điểm cao nhất mỗi ký tự
    passed: string[];                           // ký tự từng viết đạt
    recent: number[];                           // điểm tối đa 10 lần viết gần nhất, mới nhất ở cuối
  };
  badges: Record<string /*mã*/, number /*thời điểm đạt*/>;
}

interface CardRecord {
  itemType: "KANA_WRITING" | "KANA_READING" | "VOCAB_MEANING" | "VOCAB_READING";
  itemId: string;                               // kana: chính ký tự · từ vựng: id dạng chuỗi
  state: "LEARNING" | "REVIEW" | "RELEARNING";  // thẻ NEW không được lưu (xem bên dưới)
  stability: number; difficulty: number;        // S và D của FSRS
  dueAt: number; lastReviewedAt: number | null;
  reps: number; lapses: number; learningStep: number;
  introducedDay: string | null;                 // ngày học lần đầu — để giới hạn thẻ mới/ngày
}
```

**Khoá thẻ** = `"<itemType>:<itemId>"`, ví dụ `KANA_WRITING:あ`, `VOCAB_MEANING:12`.

**Thẻ mới là thẻ "ảo":** chưa có trong `cards` cho tới lần chấm đầu tiên; hàng đợi tự chọn mục chưa có thẻ theo thứ tự dạy học.

**Không còn lưu** (so với v1): nhật ký từng lần ôn, từng bài viết thô (nét, lỗi từng nét), từng lượt làm quiz. Chúng chỉ phục vụ phân tích phía máy chủ.

### 2.1 Tệp sao lưu

Xuất = đúng `JSON.stringify(ProgressState, null, 2)`. Nhập = `parseState` (JSON hợp lệ → `version` không mới hơn bản hiện tại → khớp schema) rồi thay thế toàn bộ.
Tệp sai không bao giờ làm thay đổi tiến độ hiện có. Dữ liệu hỏng ở `localStorage` được giữ ở khoá `kd.progress.corrupt`.

### 2.2 Khoá khác

| Khoá | Nội dung |
|---|---|
| `kd.theme` | `"light"` \| `"dark"` — giao diện (không thuộc `ProgressState`) |
| `kd.progress.corrupt` | bản sao khối tiến độ bị hỏng, để cứu hộ |

---

## 3. Thuật toán FSRS-6

Cài trong `web/src/lib/fsrs.ts` — **thuần hàm, không phụ thuộc React hay I/O, dễ unit test**.

### 3.1 Tham số mặc định (21 số, FSRS-6)

```ts
export const W = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001,
  1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014,
  1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
] as const;
```

### 3.2 Công thức

```
decay  = -w20
factor = 0.9^(1/decay) - 1

Khả năng nhớ lại sau t ngày:
  R(t,S) = (1 + factor * t / S)^decay

Lần đầu (n = 1), grade G ∈ {1,2,3,4}:
  S0(G) = w[G-1]
  D0(G) = clamp(w4 - e^(w5*(G-1)) + 1, 1, 10)

Cập nhật độ khó (n ≥ 2):
  ΔD    = -w6 * (G - 3)
  Dp    = D + ΔD * (10 - D) / 9
  D'    = clamp(w7 * D0(4) + (1 - w7) * Dp, 1, 10)

Ổn định khi nhớ được (G ≥ 2):
  S' = S * (1 + e^w8 * (11 - D) * S^(-w9) * (e^(w10*(1-R)) - 1) * hard * easy)
  hard = (G == 2) ? w15 : 1
  easy = (G == 4) ? w16 : 1

Ổn định khi quên (G = 1):
  S' = min(S,  w11 * D^(-w12) * ((S+1)^w13 - 1) * e^(w14*(1-R)) )

Ôn lại trong cùng ngày (elapsed < 1 ngày):
  S' = S * e^(w17 * (G - 3 + w18)) * S^(-w19)

Khoảng cách tới lần ôn kế:
  I = (S / factor) * (retention^(1/decay) - 1)        , retention mặc định 0.90
  I = clamp(round(I), 1, 36500) ngày
```

**Bẫy cần tránh:** `S` phải luôn > 0 trước khi lấy luỹ thừa âm; `R` tính bằng số ngày *thực tế* đã trôi
(`elapsedDays`, có phần thập phân), không phải số ngày đã lên lịch.

### 3.3 Bước học (learning steps)

Thẻ NEW/LEARNING chưa dùng FSRS mà đi qua các mốc phút: `[1, 10]` phút.
Trả lời Again → về bước 0. Good ở bước cuối → chuyển REVIEW và bắt đầu tính FSRS. Easy → tốt nghiệp ngay.
RELEARNING dùng mốc `[10]` phút. Sai lúc đang học (LEARNING/RELEARNING) **không** tính vào `lapses`.

### 3.4 Điểm nét viết → grade (điểm khác biệt của sản phẩm)

Anki/WaniKani bắt người học **tự chấm** "tôi có nhớ không" — dữ liệu nhiễu.
Ở đây grade được **đo** từ độ chính xác nét viết:

```ts
export function gradeFromScore(score: number, anyStrokeFailed: boolean): Grade {
  if (anyStrokeFailed || score < 48) return 1;   // Again
  if (score < 70) return 2;                      // Hard
  if (score < 88) return 3;                      // Good
  return 4;                                      // Easy
}
```

---

## 4. Trò chơi hoá

Cài trong `web/src/lib/learning/activity.ts` và `badges.ts`.

### 4.1 XP

| Hành động | XP |
|---|---|
| Ôn 1 thẻ đúng (grade ≥ 2) | 10 |
| Ôn 1 thẻ sai | 3 (vẫn thưởng để không phạt việc học) |
| Viết đạt lần đầu 1 ký tự | 25 |
| Hoàn thành quiz | 20 + đúng×5 |
| Đạt mục tiêu ngày | +50 thưởng |

`level = floor(sqrt(xp_total / 100)) + 1`; XP còn thiếu để lên cấp kế = `100·level² − xp_total`.

### 4.2 Streak — tính theo **ngày địa phương của thiết bị**

```
d  = ngày hôm nay theo múi giờ thiết bị
d0 = stats.lastActiveDate
d0 == null         → current_streak = 1
d == d0            → không đổi
d == d0 + 1        → current_streak += 1
d == d0 + 2        → nếu còn streak_freezes: trừ 1 freeze, streak += 1
                     ngược lại: current_streak = 1
d >  d0 + 2        → current_streak = 1
longest_streak = max(longest_streak, current_streak)
```

Streak chỉ cộng khi **đạt mục tiêu XP ngày** (`settings.dailyGoalXp`), không phải chỉ mở app.
Thẻ băng hồi đầy về 2 vào mỗi Thứ Hai (giờ thiết bị): nếu `weekStart(hôm nay) ≠ stats.freezeWeek` thì coi như đã hồi.

### 4.3 Huy hiệu

| code | tên | điều kiện | được xét khi |
|---|---|---|---|
| FIRST_STROKE | Nét đầu tiên | `writing.passed` không rỗng | viết |
| HIRAGANA_MASTER | Bậc thầy Hiragana | cả 46 hiragana cơ bản có thẻ `KANA_WRITING` ở trạng thái REVIEW | viết, ôn |
| KATAKANA_MASTER | Bậc thầy Katakana | như trên cho katakana | viết, ôn |
| STREAK_7 / 30 / 100 | Kiên trì 7/30/100 ngày | `currentStreak` đạt mốc | mọi sự kiện |
| PERFECT_10 | Mười điểm tuyệt đối | `writing.recent` đủ 10 lần, tất cả ≥ 95 | viết |
| NIGHT_OWL | Cú đêm | giờ địa phương ≥ 23 | mọi sự kiện |
| REVIEW_1000 | Nghìn lượt ôn | `totalReviews` ≥ 1000 | viết, ôn |

`evaluateBadges(draft, event, clock)` ghi huy hiệu mới vào bản nháp và trả mã các huy hiệu vừa đạt; huy hiệu đã có không bao giờ trao lại.

---

## 5. Luồng thao tác

Mỗi thao tác là một hàm thuần `(state, …, clock) → { state', result }` (xem `reviews.ts`, `quiz.ts`); `store.ts` bọc chúng, ghi `localStorage` và báo React.

### 5.1 Hàng đợi ôn — `buildQueue(state, { limit = 20, types? }, clock)`

1. `limit` kẹp trong 1..100; `types` rỗng = mọi loại, theo thứ tự `KANA_WRITING, KANA_READING, VOCAB_MEANING, VOCAB_READING`.
2. **Thẻ đến hạn:** thẻ đã lưu có `dueAt ≤ now` và đúng loại, sắp theo `dueAt` tăng dần (trễ nhất trước), tối đa `limit`.
3. **Thẻ mới:** nếu còn chỗ, bổ sung tối đa `min(limit − số đến hạn, 10 − số thẻ có introducedDay = hôm nay)` mục chưa có thẻ, theo loại rồi theo thứ tự dạy học.

Trả `{ content, dueCount, newCount }`. Hạn mức thẻ mới là **10/ngày** (`NEW_CARDS_PER_DAY`).

### 5.2 Chấm thẻ — `gradeCard(state, cardKey, grade, durationMs, clock)`

Áp FSRS (`elapsedDays` = thời gian thật kể từ `lastReviewedAt`; thẻ chưa từng ôn = 0) → cộng XP (`10` nếu grade ≥ 2, `3` nếu sai) → xét huy hiệu `REVIEW_GRADED`.
Khoá thẻ không tồn tại (loại lạ, ký tự/từ không có trong nội dung) ném lỗi và không đổi trạng thái.

### 5.3 Luyện viết — `recordWriting(state, { character, avgScore, strokeErrors, durationMs }, clock)`

Làm đủ năm việc trong **một** thao tác (trạng thái chỉ thay khi cả năm xong):

1. ghi `writing.best`, `writing.passed`, `writing.recent`;
2. `grade = gradeFromScore(avgScore, strokeErrors không rỗng)`; `passed = grade ≥ 3`;
3. áp FSRS lên thẻ `KANA_WRITING:<ký tự>` (tạo nếu chưa có);
4. XP: `25` nếu `passed` **và** ký tự chưa từng đạt; ngược lại `reviewXp(grade)`;
5. cộng hoạt động ngày/streak, xét huy hiệu `WRITING_ATTEMPT`.

`avgScore` được làm tròn và kẹp trong 0..100. Ký tự không tồn tại ném lỗi.

### 5.4 Quiz — `submitQuiz(state, quizId, answers, durationMs, clock)`

Chấm toàn bộ câu của đề: đúng khi `correctAnswer` khớp câu trả lời sau khi bỏ khoảng trắng hai đầu, **không phân biệt hoa thường**; câu thiếu = sai.
`score = round(100 · đúng / tổng số câu của đề)`. XP = `20 + 5·đúng`, cộng vào hoạt động ngày, xét huy hiệu `QUIZ_SUBMITTED`.
Giao diện chỉ cho nộp một lần mỗi lượt (kể cả khi hết giờ trùng lúc bấm nộp).

### 5.5 Tiến độ hiển thị

- **Lưới kana** (`kanaProgress`): mỗi ký tự một ô — `level 0` chưa học · `1` đang học (LEARNING/RELEARNING) · `2` đã qua bước học (REVIEW); kèm `bestScore`, `dueAt`.
- **Tổng hợp** (`summaryOf`): `kanaLearned` = số thẻ viết đã có · `kanaMastered` = thẻ viết ở REVIEW với `stability ≥ 21` ngày · `dueToday` = số thẻ có `dueAt ≤ now`.
- **Heatmap** (`heatmapOf(state, days)`): `days` ngày gần nhất, từ cũ đến mới, ngày trống có `xp = 0`.

---

## 6. Quyền riêng tư và bảo mật

1. Không có tài khoản, không có máy chủ nhận dữ liệu: tiến độ không bao giờ được gửi đi đâu.
2. Không có cookie, không có bộ theo dõi. Tài nguyên ngoài duy nhất là font từ Google Fonts.
3. Dữ liệu từ bên ngoài (tệp nhập) luôn đi qua zod trước khi vào trạng thái; dữ liệu trong `localStorage` cũng vậy khi nạp.
4. Đáp án quiz có trong bundle — quiz là công cụ tự học, không phải bài thi.
5. Header an toàn (`nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) do `web/nginx.conf` đặt; HSTS để bên đầu cuối TLS đặt.
