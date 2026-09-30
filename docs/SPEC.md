# Kana Dōjō — Đặc tả kỹ thuật v1 (nguồn sự thật cho cả BE và FE)

Mọi con số, tên bảng, tên trường, đường dẫn API trong tài liệu này là **bắt buộc**.
Backend và frontend được xây từ cùng file này nên phải khớp tuyệt đối.

---

## 0. Ngăn xếp công nghệ

| Tầng | Công nghệ | Ghi chú |
|---|---|---|
| Backend | Spring Boot 3.2.5, Java 17, Maven | giữ nguyên từ dự án cũ |
| CSDL | PostgreSQL 16 | |
| Migration | **Flyway** | thay `ddl-auto: update` — bắt buộc |
| Auth | Spring Security + JJWT 0.12.5 + Google ID token | access + refresh |
| API doc | springdoc-openapi 2.5.0 | `/swagger-ui.html` |
| Frontend | Next.js 15 App Router, TypeScript, Tailwind CSS v4 | |
| Server state | TanStack Query v5 | |
| Base path | `/api/v1` | |

---

## 1. Quy ước API

* JSON, `camelCase`, thời gian ISO-8601 UTC (`2026-09-07T18:00:00Z`).
* Lỗi luôn theo **RFC 7807 Problem Details**:

```json
{ "type":"https://kanadojo.app/errors/validation",
  "title":"Dữ liệu không hợp lệ", "status":400,
  "detail":"Email đã được sử dụng", "instance":"/api/v1/auth/register",
  "errors":{"email":"Email đã được sử dụng"} }
```

* Phân trang: `?page=0&size=20&sort=field,asc` → `{ content, page, size, totalElements, totalPages }`
* Access token: header `Authorization: Bearer <jwt>`, sống **15 phút**.
* Refresh token: chuỗi ngẫu nhiên 256-bit, **chỉ lưu hash SHA-256** trong CSDL, sống **30 ngày**, **xoay vòng mỗi lần dùng** (rotation + phát hiện tái sử dụng → thu hồi cả họ token).

---

## 2. Lược đồ CSDL (Flyway `V1__init.sql`)

Tất cả bảng có `id BIGSERIAL PRIMARY KEY`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`,
`updated_at TIMESTAMPTZ`. Chỉ liệt kê cột nghiệp vụ.

### 2.1 Danh tính & thanh toán

**users**
| cột | kiểu | ràng buộc |
|---|---|---|
| email | citext | UNIQUE NOT NULL |
| username | varchar(32) | UNIQUE NOT NULL |
| password_hash | varchar(100) | NULL (tài khoản chỉ dùng OAuth) |
| display_name | varchar(64) | NOT NULL |
| avatar_url | text | |
| role | varchar(16) | NOT NULL DEFAULT 'USER' — USER \| ADMIN |
| plan | varchar(16) | NOT NULL DEFAULT 'FREE' — FREE \| PRO |
| timezone | varchar(64) | NOT NULL DEFAULT 'Asia/Ho_Chi_Minh' |
| locale | varchar(8) | NOT NULL DEFAULT 'vi' |
| daily_goal_xp | int | NOT NULL DEFAULT 50 |
| email_verified | boolean | NOT NULL DEFAULT false |
| status | varchar(16) | NOT NULL DEFAULT 'ACTIVE' — ACTIVE \| SUSPENDED \| DELETED |
| last_login_at | timestamptz | |

`timezone` là **bắt buộc về mặt nghiệp vụ**: streak được tính theo ngày địa phương của người học, không phải UTC.

**user_oauth** — `user_id FK`, `provider varchar(16)`, `provider_user_id varchar(128)`, `email citext`
→ `UNIQUE(provider, provider_user_id)`

**refresh_tokens** — `user_id FK`, `token_hash char(64) UNIQUE`, `family_id uuid`, `expires_at timestamptz`,
`revoked_at timestamptz`, `replaced_by char(64)`, `user_agent text`, `ip inet`
→ index `(user_id, expires_at)`

**subscriptions** — `user_id FK`, `plan varchar(16)`, `status varchar(16)` (ACTIVE|PAST_DUE|CANCELED|EXPIRED),
`started_at`, `current_period_end`, `cancel_at`, `provider varchar(24)`, `provider_ref varchar(128)`

**plan_features** — `plan varchar(16)`, `feature_key varchar(48)`, `limit_value int` (NULL = không giới hạn)
→ `UNIQUE(plan, feature_key)`. Seed:

| plan | feature_key | limit_value |
|---|---|---|
| FREE | srs.daily_reviews | 60 |
| FREE | writing.daily_attempts | 100 |
| FREE | content.jlpt_levels | 5 (chỉ N5) |
| FREE | stats.history_days | 30 |
| PRO | srs.daily_reviews | NULL |
| PRO | writing.daily_attempts | NULL |
| PRO | content.jlpt_levels | 1 (đến N1) |
| PRO | stats.history_days | NULL |

### 2.2 Kho nội dung

**kana_glyphs** — `glyph char(1) PRIMARY KEY`, `stroke_paths jsonb NOT NULL` (mảng chuỗi `d` của SVG),
`stroke_count int NOT NULL`, `view_box int NOT NULL DEFAULT 109`

**kana_characters**
| cột | kiểu | ghi chú |
|---|---|---|
| character | varchar(4) UNIQUE NOT NULL | "あ", "きゃ" |
| glyph_sequence | varchar(4) NOT NULL | các glyph thành phần, khớp `kana_glyphs.glyph` |
| romaji | varchar(8) NOT NULL | |
| script | varchar(12) NOT NULL | HIRAGANA \| KATAKANA |
| kana_group | varchar(12) NOT NULL | BASIC \| DAKUTEN \| YOON |
| row_key | varchar(8) NOT NULL | 'a', 'ka', 'kya'… |
| col_index | smallint NOT NULL | |
| stroke_count | smallint NOT NULL | tổng của mọi glyph |
| reading_vi | varchar(64) | gợi ý đọc tiếng Việt |
| display_order | int NOT NULL | |
→ index `(script, kana_group, display_order)`

Seed từ `docs/kana-data.json`: **208 ký tự, 148 glyph**. Viết seeder Java `KanaSeeder`
(`ApplicationRunner`, idempotent — chỉ chèn khi bảng rỗng) đọc file từ classpath
`classpath:data/kana-data.json`.

**vocabulary** — `word varchar(64)`, `reading varchar(64)`, `romaji varchar(64)`,
`meaning_vi text NOT NULL`, `meaning_en text`, `jlpt_level smallint` (5..1),
`part_of_speech varchar(24)`, `example_ja text`, `example_vi text`, `audio_url text`
→ index `(jlpt_level)`

**decks** — `owner_id FK NULL` (NULL = bộ hệ thống), `name`, `description`, `is_public boolean`,
`jlpt_level smallint`, `item_type varchar(24)`

**deck_items** — `deck_id FK`, `item_type varchar(24)`, `item_id bigint`, `position int`
→ `UNIQUE(deck_id, item_type, item_id)`

### 2.3 Học tập & SRS

**review_cards** — một thẻ = một *khía cạnh* của một mục nội dung
| cột | kiểu | ghi chú |
|---|---|---|
| user_id | FK NOT NULL | |
| item_type | varchar(24) NOT NULL | KANA_WRITING \| KANA_READING \| VOCAB_MEANING \| VOCAB_READING |
| item_id | bigint NOT NULL | |
| state | varchar(12) NOT NULL | NEW \| LEARNING \| REVIEW \| RELEARNING |
| stability | double precision NOT NULL DEFAULT 0 | S của FSRS |
| difficulty | double precision NOT NULL DEFAULT 0 | D của FSRS, 1..10 |
| due_at | timestamptz NOT NULL | |
| last_reviewed_at | timestamptz | |
| reps | int NOT NULL DEFAULT 0 | |
| lapses | int NOT NULL DEFAULT 0 | |
| learning_step | smallint NOT NULL DEFAULT 0 | |
| suspended | boolean NOT NULL DEFAULT false | |
→ `UNIQUE(user_id, item_type, item_id)`, index `(user_id, due_at) WHERE NOT suspended`

**review_logs** — `card_id FK`, `user_id FK`, `grade smallint` (1..4), `score smallint` (0..100, NULL nếu không phải bài viết),
`state_before varchar(12)`, `stability_before/after double precision`, `difficulty_before/after double precision`,
`elapsed_days double precision`, `scheduled_days double precision`, `duration_ms int`, `reviewed_at timestamptz`
→ index `(user_id, reviewed_at)`. **Chỉ ghi thêm, không sửa** — đây là dữ liệu để sau này tối ưu tham số FSRS riêng cho từng người.

**writing_attempts** — `user_id FK`, `kana_character_id FK`, `mode varchar(8)` (TRACE|TEST),
`avg_score smallint`, `stroke_scores jsonb` (mảng số), `stroke_errors jsonb`
(mảng `{index, reason}`, reason ∈ REVERSED|TOO_SHORT|TOO_LONG|WRONG_ORDER|OFF_PATH),
`passed boolean`, `duration_ms int`
→ index `(user_id, kana_character_id, created_at DESC)`

### 2.4 Trò chơi hóa

**user_stats** — `user_id FK UNIQUE`, `xp_total bigint DEFAULT 0`, `level int DEFAULT 1`,
`current_streak int DEFAULT 0`, `longest_streak int DEFAULT 0`, `last_active_date date`,
`streak_freezes smallint DEFAULT 2`, `total_reviews bigint DEFAULT 0`, `total_writing_ms bigint DEFAULT 0`

**daily_activity** — `user_id FK`, `activity_date date`, `xp_earned int`, `reviews_done int`,
`chars_written int`, `study_ms int`, `goal_met boolean`
→ `UNIQUE(user_id, activity_date)`, index `(activity_date, xp_earned DESC)`

**badges** — `code varchar(48) UNIQUE`, `name_vi`, `description_vi`, `icon varchar(16)`,
`tier varchar(12)` (BRONZE|SILVER|GOLD), `criteria jsonb`, `sort_order int`

**user_badges** — `user_id FK`, `badge_id FK`, `earned_at` → `UNIQUE(user_id, badge_id)`

**leaderboard_snapshots** — `week_start date`, `user_id FK`, `xp int`, `rank int`
→ `UNIQUE(week_start, user_id)`, index `(week_start, rank)`

### 2.5 Quiz

**quizzes** — `title`, `description`, `quiz_type varchar(24)`, `jlpt_level smallint`, `time_limit_sec int`, `is_published boolean`
**questions** — `quiz_id FK`, `prompt text`, `question_type varchar(24)`, `options jsonb`, `correct_answer text`, `explanation_vi text`, `position int`
**quiz_attempts** — `user_id FK`, `quiz_id FK`, `score smallint`, `correct_count int`, `total_count int`, `duration_ms int`, `started_at`, `submitted_at`
**quiz_answers** — `attempt_id FK`, `question_id FK`, `given_answer text`, `is_correct boolean`

Giá trị hợp lệ (không có CHECK trong CSDL, do quy ước):

| cột | giá trị |
|---|---|
| `quizzes.quiz_type` | KANA_READING \| VOCAB_MEANING \| ROMAJI_INPUT |
| `questions.question_type` | MULTIPLE_CHOICE (`options` bắt buộc, chứa `correct_answer`) \| TEXT_INPUT (`options = []`) |
| `vocabulary.part_of_speech` | NOUN \| PRONOUN \| VERB \| I_ADJ \| NA_ADJ \| ADVERB \| EXPRESSION |

Chấm điểm: so khớp `correct_answer` với câu trả lời sau khi bỏ khoảng trắng hai đầu, **không phân biệt hoa thường**.

### 2.6 Dữ liệu khởi đầu (migration)

| File | Nội dung |
|---|---|
| `V1__init.sql` | 22 bảng, chỉ mục, ràng buộc |
| `V2__seed_reference.sql` | `plan_features` (8 dòng) + 9 huy hiệu |
| `V3__seed_content.sql` | 70 từ N5 + 10 từ N4, bộ thẻ hệ thống "Từ vựng N5 cơ bản", 4 quiz đã xuất bản (38 câu) |
| `V4__typing_sessions.sql` | bảng `typing_sessions` (luyện gõ, §2.7) |

Kana (208 ký tự, 148 glyph) **không** nằm trong migration mà do `KanaSeeder` nạp từ JSON.

### 2.7 Luyện gõ (`V4__typing_sessions.sql`)

**typing_sessions** — mỗi dòng là một lượt gõ đã chấm, chỉ ghi thêm
| cột | kiểu | ghi chú |
|---|---|---|
| user_id | FK NOT NULL | |
| input_method | varchar(8) NOT NULL | ROMAJI \| KANA \| IME (CHECK) |
| content_type | varchar(12) NOT NULL | HIRAGANA \| KATAKANA \| MIXED \| KANJI \| KANA_DRILL (CHECK) |
| mode | varchar(16) NOT NULL | PASSAGE \| TIME_ATTACK \| SUDDEN_DEATH (CHECK) |
| duration_ms | int NOT NULL | > 0 |
| correct_keys, miss_keys | int NOT NULL | số phím đúng / sai (IME: quy đổi ra số phím romaji tối thiểu) |
| chars_typed, phrases_completed | int NOT NULL | số kana và số câu đã gõ xong |
| kpm, accuracy | double precision NOT NULL | **server tính lại**, `accuracy` ∈ [0, 1] |
| score | int NOT NULL | server tính lại, xem dưới |
| xp_earned | int NOT NULL DEFAULT 0 | |
→ index `(user_id, created_at DESC)` và `(user_id, input_method, content_type, mode, score DESC)`

Câu mẫu **không** nằm trong CSDL mà đóng gói ở frontend (`web/src/data/typing-texts.ts`), vì bảng chỉ cần số đo để xếp kỷ lục.

Chấm điểm (`TypingScoring.java` ≡ `web/src/lib/typing/score.ts`, phải khớp tuyệt đối):
```
KPM      = correct_keys × 60000 / duration_ms
accuracy = correct_keys / (correct_keys + miss_keys)      (chưa gõ gì = 1)
score    = round(KPM × accuracy³)                          (cách chấm của e-typing)
         = correct_keys                                    nếu mode = SUDDEN_DEATH
```
Client **không** gửi điểm; server từ chối lượt có KPM > 1500 (400, `errors.correctKeys`).
Chi tiết nghiên cứu, luật chấp nhận romaji và thang đai: [TYPING.md](TYPING.md).

---

## 3. Thuật toán FSRS-6

Cài trong `com.japanese.learning.srs.FsrsEngine` — **thuần hàm, không phụ thuộc Spring, dễ unit test**.

### 3.1 Tham số mặc định (21 số, FSRS-6)

```java
static final double[] W = {
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001,
  1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014,
  1.8729, 0.5425, 0.0912, 0.0658, 0.1542
};
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

Ôn lại trong cùng ngày:
  S' = S * e^(w17 * (G - 3 + w18)) * S^(-w19)

Khoảng cách tới lần ôn kế:
  I = (S / factor) * (retention^(1/decay) - 1)        , retention mặc định 0.90
  I = clamp(round(I), 1, 36500) ngày
```

**Bẫy cần tránh:** `S` phải luôn > 0 trước khi lấy luỹ thừa âm; `R` tính bằng số ngày *thực tế* đã trôi
(`elapsedDays`, có phần thập phân), không phải số ngày đã lên lịch.

### 3.3 Bước học (learning steps)

Thẻ NEW/LEARNING chưa dùng FSRS mà đi qua các mốc phút: `[1, 10]` phút.
Trả lời Again → về bước 0. Good ở bước cuối → chuyển REVIEW và bắt đầu tính FSRS.
RELEARNING dùng mốc `[10]` phút.

### 3.4 Điểm nét viết → grade (điểm khác biệt của sản phẩm)

Anki/WaniKani bắt người học **tự chấm** "tôi có nhớ không" — dữ liệu nhiễu.
Ở đây grade được **đo** từ độ chính xác nét viết:

```java
static int gradeFromScore(int score, boolean anyStrokeFailed) {
    if (anyStrokeFailed || score < 48) return 1;   // Again
    if (score < 70)  return 2;                     // Hard
    if (score < 88)  return 3;                     // Good
    return 4;                                      // Easy
}
```

Ghi cả `score` gốc vào `review_logs.score` để sau này huấn luyện lại tham số FSRS theo từng người.

---

## 4. Trò chơi hóa

### 4.1 XP

| Hành động | XP |
|---|---|
| Ôn 1 thẻ đúng (grade ≥ 2) | 10 |
| Ôn 1 thẻ sai | 3 (vẫn thưởng để không phạt việc học) |
| Viết đạt lần đầu 1 ký tự | 25 |
| Hoàn thành quiz | 20 + đúng×5 |
| Một lượt luyện gõ | `min(50, 5 + phím đúng / 10)`; dưới 20 phím đúng: 0 |
| Đạt mục tiêu ngày | +50 thưởng |

`level = floor(sqrt(xp_total / 100)) + 1`

### 4.2 Streak — tính theo **ngày địa phương của người học**

```
d  = ngày hôm nay theo users.timezone
d0 = user_stats.last_active_date
d == d0            → không đổi
d == d0 + 1        → current_streak += 1
d >  d0 + 1        → nếu còn streak_freezes và khoảng hở đúng 1 ngày:
                       trừ 1 freeze, streak += 1
                     ngược lại: current_streak = 1
longest_streak = max(longest_streak, current_streak)
```

Streak chỉ cộng khi **đạt mục tiêu XP ngày** (`daily_goal_xp`), không phải chỉ mở app.
Hồi đầy freeze về tối đa 2 vào mỗi thứ Hai.

### 4.3 Huy hiệu (seed sẵn)

| code | tên | điều kiện |
|---|---|---|
| FIRST_STROKE | Nét đầu tiên | viết đạt 1 ký tự |
| HIRAGANA_MASTER | Bậc thầy Hiragana | thuộc đủ 46 hiragana cơ bản |
| KATAKANA_MASTER | Bậc thầy Katakana | thuộc đủ 46 katakana cơ bản |
| STREAK_7 / 30 / 100 | Kiên trì 7/30/100 ngày | streak đạt mốc |
| PERFECT_10 | Mười điểm tuyệt đối | 10 ký tự liên tiếp ≥ 95 điểm |
| NIGHT_OWL | Cú đêm | học sau 23h địa phương |
| REVIEW_1000 | Nghìn lượt ôn | tổng 1000 lượt ôn |

Kiểm tra huy hiệu trong `BadgeService.evaluate(userId, event)` gọi sau mỗi lần ghi nhận hoạt động.

### 4.4 Bảng xếp hạng

Tuần bắt đầu **thứ Hai 00:00 giờ VN**. Trong tuần: truy vấn trực tiếp `daily_activity`.
Job `@Scheduled(cron = "0 5 0 * * MON", zone = "Asia/Ho_Chi_Minh")` chốt tuần trước vào `leaderboard_snapshots`.

---

## 5. Hợp đồng API

Tất cả đường dẫn có tiền tố `/api/v1`. 🔒 = cần đăng nhập.

### Auth
| Method | Path | Body / Query | Trả về |
|---|---|---|---|
| POST | `/auth/register` | `{email, username, password, displayName, timezone?}` | `AuthResponse` |
| POST | `/auth/login` | `{emailOrUsername, password}` | `AuthResponse` |
| POST | `/auth/google` | `{idToken}` | `AuthResponse` |
| POST | `/auth/refresh` | `{refreshToken}` | `AuthResponse` |
| POST | `/auth/logout` 🔒 | `{refreshToken}` | 204 |
| GET | `/auth/me` 🔒 | | `UserDto` |
| PATCH | `/auth/me` 🔒 | `{displayName?, timezone?, dailyGoalXp?, locale?}` | `UserDto` |

`AuthResponse = { accessToken, refreshToken, expiresIn, user: UserDto }`
`UserDto = { id, email, username, displayName, avatarUrl, role, plan, timezone, locale, dailyGoalXp, createdAt }`

### Nội dung
| Method | Path | Ghi chú |
|---|---|---|
| GET | `/kana?script=&group=` | `KanaCharacterDto[] = {id, character, romaji, script, group, rowKey, colIndex, strokeCount, readingVi, displayOrder}`, **không** kèm dữ liệu nét |
| GET | `/kana/{id}` | kèm `glyphs: [{glyph, strokePaths, strokeCount}]` |
| GET | `/kana/strokes` | **toàn bộ** 148 glyph, `Cache-Control: public, max-age=31536000, immutable` + ETag |
| GET | `/vocabulary?level=&page=&size=&q=` | `Page<VocabularyDto>`; gói FREE chỉ thấy N5 (lọc theo `content.jlpt_levels`) |
| GET | `/decks?public=true` | |

### Học tập 🔒
| Method | Path | Ghi chú |
|---|---|---|
| GET | `/reviews/queue?limit=20&types=KANA_WRITING,VOCAB_MEANING` | `ReviewQueueDto{content: ReviewQueueItemDto[], dueCount, newCount}` — thẻ đến hạn trước, rồi thẻ mới (tối đa `app.srs.new-cards-per-day`/ngày). Không truyền `types` = mọi loại |
| POST | `/reviews/grade` | `{cardId, grade, score?, durationMs}` → `GradeResultDto{cardId, nextDueAt, intervalDays, stability, difficulty, state, xpEarned}` |
| POST | `/writing/attempts` | `{kanaCharacterId, mode, strokeScores[], strokeErrors[], avgScore, durationMs}` → `WritingResultDto{passed, avgScore, grade, xpEarned, card: GradeResultDto?, newBadges: string[]}` (`newBadges` là **mã** huy hiệu, tra tên qua `GET /badges`) |
| GET | `/progress/kana?script=` | `[{characterId, character, state, dueAt, bestScore, level}]` — cấp cho lưới bảng chữ |
| GET | `/progress/summary` | `{kanaLearned, kanaMastered, vocabLearned, dueToday, newAvailable}` |

**Quan trọng:** `POST /writing/attempts` là **một giao dịch duy nhất** làm cả 5 việc:
ghi `writing_attempts` → suy ra grade → cập nhật `review_cards` bằng FSRS → ghi `review_logs`
→ cộng XP/streak/`daily_activity` → xét huy hiệu. Không tách thành nhiều lần gọi API,
vì tách sẽ tạo trạng thái nửa vời khi mạng rớt giữa chừng.

### Trò chơi hóa 🔒
| Method | Path |
|---|---|
| GET | `/stats/me` → `{xpTotal, level, xpToNextLevel, currentStreak, longestStreak, streakFreezes, todayXp, dailyGoalXp, goalMet}` |
| GET | `/stats/heatmap?days=365` → `[{date, xp, reviews}]` |
| GET | `/badges` → tất cả huy hiệu + `earnedAt` của người dùng |
| GET | `/leaderboard/weekly?limit=50` → `{weekStart, myRank, entries:[{rank, userId, displayName, avatarUrl, xp}]}` |

### Quiz 🔒
| Method | Path | Trả về |
|---|---|---|
| GET | `/quizzes?page=&size=` | `Page<QuizDto{id, title, description, quizType, jlptLevel, timeLimitSec, questionCount}>` — chỉ bài đã xuất bản |
| GET | `/quizzes/{id}` | `QuizDetailDto{…, questions:[{id, prompt, questionType, options[], position}]}` — **không bao giờ** kèm đáp án |
| POST | `/quizzes/{id}/attempts` | `QuizAttemptDto{attemptId, quizId, startedAt, totalCount}` |
| POST | `/quiz-attempts/{id}/submit` | body `{answers:[{questionId, givenAnswer?}]}` → `QuizResultDto{attemptId, quizId, score, correctCount, totalCount, xpEarned, answers:[{questionId, givenAnswer, correct, correctAnswer, explanationVi}]}` |

Mỗi lượt chỉ nộp được một lần. `score` = % câu đúng trên tổng số câu của đề (câu không gửi tính là sai).
Hết `timeLimitSec` thì client tự nộp; backend hiện không chặn nộp muộn.

### Luyện gõ 🔒
| Method | Path | Trả về |
|---|---|---|
| POST | `/typing/sessions` | body `{inputMethod, contentType, mode, durationMs (1000..3600000), correctKeys, missKeys, charsTyped, phrasesCompleted}` → `TypingResultDto{sessionId, score, kpm, accuracy, xpEarned, personalBest, newBest}` |
| GET | `/typing/stats` | `TypingStatsDto{totalSessions, totalDurationMs, bests:[{inputMethod, contentType, mode, bestScore, bestKpm, bestAccuracy, plays, lastPlayedAt}], recent: TypingSessionDto[≤10]}` |

Một lần gọi `POST /typing/sessions` là **một giao dịch**: tính lại điểm → so kỷ lục cũ → cộng XP/streak/`daily_activity`
(`study_ms += durationMs`) → lưu lượt. `personalBest`/`newBest` so trong cùng tổ hợp cách nhập × nội dung × chế độ.

### Gói cước 🔒
`GET /me/entitlements` → `{plan, features:{"srs.daily_reviews":60,...}, usage:{"srs.daily_reviews":12}}`

Vượt hạn mức gói FREE → **429** với `type: .../errors/quota-exceeded` và `detail` nói rõ hạn mức nào.

---

## 6. Bảo mật — không được bỏ qua

1. Mật khẩu: BCrypt strength 12. Tối thiểu 8 ký tự.
2. `app.jwt.secret` **phải** đọc từ biến môi trường, không hardcode. Ứng dụng **không khởi động được**
   nếu thiếu ở profile `prod` (fail fast).
3. Refresh token chỉ lưu hash. Xoay vòng mỗi lần dùng. Dùng lại token cũ → thu hồi cả `family_id`.
4. CORS: chỉ cho phép origin trong `app.cors.allowed-origins`.
5. Rate limit `/auth/login` và `/auth/register`: 10 request / phút / IP (Bucket4j in-memory là đủ cho v1).
6. Google: xác thực `idToken` bằng `google-api-client`, kiểm tra `aud` khớp client id và `email_verified`.
7. Mọi endpoint 🔒 lấy `userId` từ `SecurityContext`, **tuyệt đối không** nhận `userId` từ body/query.
