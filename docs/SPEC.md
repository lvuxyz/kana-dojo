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
| PWA | `app/manifest.ts`, service worker sinh lúc build (`web/scripts/`) | cài ra màn hình chính, chạy offline — xem §8 |
| Kiểm thử | Vitest | chạy trong Node: `localStorage` giả, Cache API giả cho service worker |

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

### 1.1 Nguồn gốc dữ liệu nét

`web/src/data/kana-data.json` là bản duy nhất. Nó được sinh một lần từ [KanjiVG](http://kanjivg.tagaini.net) (6.763 tệp SVG) bằng `build_data.py` của bản v1: lọc 148 glyph kana,
làm tròn toạ độ, gắn romaji và gợi ý đọc tiếng Việt. Script đó **không còn trong cây thư mục** (thư mục `archive/legacy-v1/` đã bị xoá) nhưng vẫn nằm trong lịch sử git:
`git show ed8ff35:archive/legacy-v1/build_data.py > build_data.py`. Muốn tái sinh dữ liệu hay mở rộng (ví dụ thêm Kanji) thì lấy lại script này và đặt nó cùng bộ KanjiVG đã tải về.

- **Chỉ lưu path `d` của từng nét**, không lưu điểm mẫu. Mỗi nét KanjiVG là *một path đơn tuyến — chính là đường tâm nét*, đúng thứ cần để vẽ hoạt ảnh và so khớp.
  Lúc mở một chữ, trình duyệt lấy 32 điểm cách đều theo độ dài cung bằng `getPointAtLength()` — gọn hơn và chính xác hơn dữ liệu "median" dựng sẵn.
- **Ký tự ghép** (きゃ) = 2 glyph: `viewBox` giãn thành `0 0 218 109`, glyph thứ hai nằm trong `translate(109, 0)`.
  `getPointAtLength()` **bỏ qua transform của thẻ cha**, nên phải cộng `dx` thủ công — chỗ rất dễ sai.
- Giấy phép: CC BY-SA 3.0 (share-alike, cho phép thương mại) — xem README.

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

Do `web/src/lib/backup.ts` xuất, **định dạng 2 (bọc)**: tiến độ học *và* không gian riêng (§2.3) trong một tệp JSON.

```json
{ "app": "kana-dojo", "format": 2, "exportedAt": "2026-10-05T03:00:00.000Z",
  "progress": { /* ProgressState v1, nguyên vẹn */ },
  "space":    { /* Space, §2.3 */ } }
```

Nhập (`parseBackup`) nhận hai dạng:

| Tệp | Cách xử lý |
|---|---|
| Bọc (`format: 2`) | Kiểm cả `progress` (`parseStateValue`) lẫn `space` (`parseSpaceValue`); sai **một** phần thì từ chối **cả tệp**. Thay cả tiến độ lẫn không gian riêng |
| `ProgressState` trần của bản cũ (không có `format`) | Chỉ thay tiến độ; **không đụng** ghi chú, bộ thẻ, cài đặt hiện có (giao diện nói rõ điều này trước khi hỏi xác nhận) |

`format` lớn hơn 2 bị từ chối ("phiên bản mới hơn"), không đoán. Mọi thứ được kiểm xong *trước* khi ghi: tệp sai không bao giờ làm đổi dữ liệu hiện có.
Ghi cũng là tất cả hoặc không gì cả: không gian riêng ghi trước, tiến độ sau; lần ghi nào thất bại (hết dung lượng) thì phần đã ghi được hoàn lại và người học nhận
thông báo "không đủ dung lượng" — không bao giờ để lại tiến độ của tệp đi cùng tài liệu cũ. Trình duyệt vốn đã không lưu được (chế độ riêng tư, bị chặn) thì vẫn khôi phục vào bộ nhớ như trước.
Dữ liệu hỏng ở `localStorage` được giữ ở `kd.progress.corrupt` / `kd.space.corrupt`. Dữ liệu của **phiên bản mới hơn** (tab cũ còn mở sau khi site cập nhật) không bị coi là hỏng:
tab đó không đọc được nên chạy trong bộ nhớ, **không bao giờ ghi đè** lên nó, khung ứng dụng nhắc đóng mọi tab rồi mở lại, và từ chối khôi phục tệp cho tới khi được mở lại.

**Vì sao bọc thay vì thêm trường vào tệp tiến độ:** bản Kana Dōjō cũ đọc tệp bọc sẽ báo "sai định dạng" và từ chối rõ ràng, thay vì nhập phần tiến độ rồi âm thầm
vứt tài liệu của người học (zod bỏ khoá lạ). Phần `progress` bên trong giữ nguyên `ProgressState` v1 từng byte nên hợp đồng web ↔ mobile ([CONTRACT.md §2](CONTRACT.md)) không đổi.
Kỷ lục luyện gõ vẫn **ngoài** tệp (quyết định đã chốt, [TYPING.md §3.4](TYPING.md#34-quyết-định-khi-gộp-vào-site-không-tài-khoản)); thêm sau này chỉ là thêm một phần vào tệp bọc.

### 2.2 Khoá khác

| Khoá | Nội dung |
|---|---|
| `kd.theme` | `"light"` \| `"dark"` — giao diện (không thuộc `ProgressState`) |
| `kd.progress.corrupt` | bản sao khối tiến độ bị hỏng, để cứu hộ |
| `kd.space.v1` | **không gian riêng** của người học (§2.3): hồ sơ, công cụ, cách học, ghi chú, bộ thẻ, câu luyện gõ — nằm trong tệp sao lưu |
| `kd.space.corrupt` | bản sao khối không gian riêng bị hỏng, để cứu hộ |
| `kd.typing.history.v1` | kỷ lục, lịch sử và chữ hay sai của phòng luyện gõ — **ngoài** `ProgressState`, không nằm trong tệp sao lưu; "Xoá toàn bộ tiến độ" có xoá (`docs/TYPING.md`) |
| `kd.typing.history.corrupt` | bản sao khối luyện gõ bị hỏng, để cứu hộ |
| `kd.device.v1` | ghi chép của riêng máy này: `lastBackupAt`, `backupSnoozeUntil`, `persistAskedAt` (mili-giây epoch hoặc `null`) — để nhắc sao lưu và xin lưu bền; **ngoài** tệp sao lưu, mất cũng không sao |
| `kd.typing.config` | lựa chọn lần trước của phòng luyện gõ (nội dung, cách nhập, chế độ…) — tiện ích, mất cũng không sao |
| Cache Storage `kd-<phiên bản>` | tệp tĩnh cho chế độ offline (§8). Xoá lúc nào cũng được — không chứa tiến độ |

Cài đặt › Dữ liệu: *Xoá việc học* xoá tiến độ (kể cả `kd.progress.corrupt`) và `kd.typing.history.*`, giữ không gian riêng và `kd.typing.config`.
*Xoá sạch mọi thứ* xoá **mọi khoá `kd.*`** trừ `kd.theme` (tuỳ chọn hiển thị của máy, giữ để trang không chớp đổi màu).

### 2.3 Không gian riêng (`Space`)

Mỗi người mở site có **một dōjō riêng**: họ chọn công cụ nào hiện ra, tự soạn tài liệu, bộ thẻ và câu luyện gõ, và quyết định cách học. Dữ liệu đó là `Space`
(schema zod: `web/src/lib/space/space.ts`), lưu ở khoá **`kd.space.v1`**, **tách khỏi `ProgressState`**: hai thứ đổi với nhịp khác nhau (mỗi nét viết ghi tiến độ, không cần ghi lại cả
kho ghi chú) và tệp tiến độ là hợp đồng web ↔ mobile, nên thêm văn bản người dùng vào đó sẽ buộc đổi hợp đồng.

```ts
interface Space {
  version: 1;
  createdAt: number;
  onboarded: boolean;                       // đã qua (hoặc bỏ qua) màn dựng không gian lần đầu
  profile: { name: string; goal: string };  // tên (≤ 40) · mục đích học tự viết (≤ 200)
  modules: ModuleId[];                      // công cụ đang bật, THEO THỨ TỰ; luôn có "home" đầu và "settings" cuối
  home: { widgets: WidgetId[] };            // khối ở Tổng quan, theo thứ tự
  study: StudyOptions;                      // cách học — xem dưới
  library: { notes: Note[]; decks: Deck[]; texts: UserText[] };
}
type ModuleId = "home" | "review" | "writing" | "library" | "typing" | "vocab" | "quiz" | "settings";
type WidgetId = "today" | "stats" | "goal" | "heatmap" | "badges" | "notes";

interface Note     { id; title; body; pinned; createdAt; updatedAt }          // body ≤ 20.000 ký tự
interface Deck     { id; name; active; reverse; createdAt; cards: DeckCard[] } // active: vào hàng ôn · reverse: hỏi cả hai chiều
interface DeckCard { id; front; back; hint }                                   // mặt trước / mặt sau / gợi ý (tuỳ chọn)
interface UserText { id; text; vi }                                            // câu luyện gõ, cú pháp {漢字|かんじ}
```

**Chuẩn hoá khi đọc:** `modules` bỏ trùng và luôn đặt `home` đầu, `settings` cuối (tắt hết công cụ vẫn còn đường vào Cài đặt); `home.widgets`, `kanaScripts`, `kanaGroups` bỏ trùng.
Mã (`id`) là `[a-z0-9]{4,24}`, duy nhất trong cả không gian (ghi chú, bộ thẻ, thẻ và câu dùng chung một miền mã).

**Giới hạn** (`LIMITS`): 500 ghi chú · 50 bộ thẻ · 5.000 thẻ tổng · 500 câu gõ; mặt trước ≤ 200, mặt sau ≤ 400, gợi ý ≤ 200 ký tự; câu gõ ≤ 200. Ngoài trần từng mục còn **trần tổng
1.000.000 ký tự JSON** (≈ 2 MB trong `localStorage`, tính 2 byte/ký tự; cả origin chỉ có ≈ 5 MiB và tiến độ chiếm tới ≈ 0,6 MiB ở kịch bản xấu nhất): vượt thì việc *thêm hoặc làm to thêm* bị từ chối
kèm thông báo, còn xoá/rút gọn luôn được (kể cả khi đang vượt trần sau khi khôi phục một tệp lớn). Lý do: ghi `localStorage` thất bại là âm thầm, người học sẽ tin ghi chú đã được lưu.

**Thao tác** là hàm thuần `(space, …) → space'` ở `lib/space/` (`space.ts`: hồ sơ, công cụ, cách học; `library.ts`: ghi chú, bộ thẻ, thẻ, câu gõ, nhập/xuất thẻ dạng văn bản). Vi phạm giới hạn ném `SpaceError`
(thông báo tiếng Việt); `store.updateSpace` bắt nó, không đổi gì và trả `{ ok: false, error }` cho giao diện. `store.ts` lo `localStorage`, đồng bộ nhiều tab (`storage` event), giữ bản hỏng ở `.corrupt`,
và lộ ra `isPersistent()` — mọi lần ghi thất bại đều hiện banner ở khu vực học.

**Ghi chú** dùng cú pháp nhẹ (`lib/space/markup.ts`): `# ## ###` tiêu đề · `- ` / `1. ` danh sách · `> ` trích dẫn · `---` đường kẻ · `**đậm**` · `` `mã` `` · `{漢字|かんじ}` furigana.
**Cố ý không có liên kết, ảnh, HTML**: bộ đọc chỉ sinh ra cây dữ liệu và giao diện dựng phần tử React từ cây đó — không có chỗ nào chèn HTML thô, nên ghi chú từ tệp sao lưu của người khác cũng không chạy được mã.

**Câu luyện gõ** phải gõ được trọn vẹn: `validateTypingText` (`lib/typing/phrases.ts`) chặn từ lúc soạn kanji trần (phải kèm cách đọc), chữ Latin, ký hiệu lạ — một câu như vậy sẽ làm ván gõ kẹt vĩnh viễn.
`userPhrases` lọc lại lần nữa lúc dựng ván, để tệp sao lưu sửa tay cũng không làm kẹt.

#### Cách học (`StudyOptions`)

| Trường | Mặc định | Ý nghĩa |
|---|---|---|
| `newCardsPerDay` | 10 | Thẻ mới tối đa mỗi ngày (0–100); 0 = chỉ ôn lại. Dùng chung cho mọi nguồn |
| `sessionSize` | 30 | Số thẻ tối đa mỗi phiên ôn (5–100) |
| `desiredRetention` | 0,9 | Xác suất nhớ mục tiêu lúc đến hạn (0,70–0,97), truyền vào `review()` của FSRS. Áp từ lần chấm kế tiếp; lịch đã hẹn không bị tính lại |
| `kanaWriting` · `kanaReading` · `vocab` · `decks` | `true` | Nguồn thẻ nào vào hàng đợi. Tắt nguồn thì thẻ của nó (kể cả thẻ đã học đến hạn) không vào hàng đợi và không tính vào `dueToday`, nhưng lịch ôn trong tiến độ **được giữ** — bật lại là tiếp tục |
| `kanaScripts` · `kanaGroups` | cả hai · cả ba | Phạm vi kana (Hiragana/Katakana × cơ bản/biến âm/âm ghép) áp cho cả thẻ viết lẫn đọc |
| `newOrder` | `"mine"` | Thứ tự cấp thẻ mới: `mine` thẻ tự soạn trước · `builtin` nội dung có sẵn trước (cách cũ) · `mixed` xen kẽ từng nguồn |

Mặc định cho kết quả **y hệt** hàng đợi trước khi có không gian riêng khi người học chưa có bộ thẻ nào.

#### Thẻ tự soạn trong tiến độ

Thẻ tự soạn đi vào `ProgressState.cards` bằng các loại thẻ **sẵn có**, nên schema tiến độ không đổi: mã mục là `u:<mã thẻ>` (tiền tố `u:` không bao giờ trùng id từ vựng đóng gói là số nguyên).

| Khoá thẻ | Hỏi → đáp | Có khi |
|---|---|---|
| `VOCAB_MEANING:u:<mã>` | mặt trước → mặt sau (gợi ý hiện kèm) | luôn có |
| `VOCAB_READING:u:<mã>` | mặt sau → mặt trước | bộ thẻ bật `reverse` |

Tắt bộ thẻ hay tắt `reverse` làm mục "không còn tồn tại" với `itemExists`: thẻ bị bỏ qua khỏi hàng đợi và bộ đếm nhưng **lịch ôn vẫn nằm trong tiến độ** (cơ chế vốn có cho nội dung bị gỡ) —
bật lại bộ thẻ là thẻ quay lại đúng lịch cũ. Bản không biết tới không gian riêng cũng chỉ coi chúng là nội dung đã gỡ, không báo lỗi tệp.
**Xoá** thẻ hay bộ thẻ thì khác: không còn cách nào học lại thẻ đó, nên lịch ôn của nó (cả hai chiều) bị bỏ khỏi tiến độ (`forgetUserCards`) để tiến độ không phình mãi.
XP, streak và huy hiệu đã nhận không đổi. Nhập tệp chỉ có tiến độ thì không dọn gì.
Ngữ cảnh học (`LearnContext` = `StudyOptions` + `Catalog` thẻ tự soạn của các bộ đang bật, `lib/learning/context.ts`) đi vào bộ máy học qua tham số, xem §5.

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

Phòng luyện gõ (`docs/TYPING.md`) **không** cộng XP và không tính vào streak hay mục tiêu ngày.

### 4.2 Streak — tính theo **ngày địa phương của thiết bị**

```
d  = ngày hôm nay theo múi giờ thiết bị
d0 = stats.lastActiveDate
d0 == null         → current_streak = 1
d <= d0            → không đổi (cùng ngày; hoặc ngày địa phương lùi: bay về phía tây, chỉnh đồng hồ) — lastActiveDate giữ nguyên
d == d0 + 1        → current_streak += 1
d == d0 + 2        → nếu còn streak_freezes: trừ 1 freeze, streak += 1
                     ngược lại: current_streak = 1
d >  d0 + 2        → current_streak = 1
longest_streak = max(longest_streak, current_streak)
```

Streak chỉ cộng khi **đạt mục tiêu XP ngày** (`settings.dailyGoalXp`), không phải chỉ mở app.
Thẻ băng hồi đầy về 2 vào mỗi Thứ Hai (giờ thiết bị): nếu `freezeWeek` là null hoặc `weekStart(hôm nay) > stats.freezeWeek` thì coi như đã hồi.
Tuần lùi về trước `freezeWeek` (ngày địa phương lùi qua Thứ Hai) không hồi thêm và không kéo `freezeWeek` lùi theo.

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

Mỗi thao tác là một hàm thuần `(state, …, clock, ctx?) → { state', result }` (xem `reviews.ts`, `quiz.ts`); `store.ts` bọc chúng, ghi `localStorage` và báo React.
`ctx` là `LearnContext` (§2.3): cách học + thẻ tự soạn của người dùng. Không truyền thì dùng `DEFAULT_CONTEXT` (toàn bộ nội dung đóng gói, 10 thẻ mới/ngày, FSRS 0,9) — hành vi như trước khi có không gian riêng.
`store.ts` luôn truyền ngữ cảnh lấy từ không gian riêng hiện tại.

### 5.1 Hàng đợi ôn — `buildQueue(state, { limit = 20, types? }, clock, ctx?)`

1. `limit` kẹp trong 1..100 (trang Ôn tập dùng `study.sessionSize`); `types` rỗng = mọi loại. Một thẻ *đủ điều kiện* khi: đúng `types`, mục còn tồn tại (`itemExists`, tính cả thẻ tự soạn trong `catalog`), và nằm trong cách học (`inStudy`: nguồn đang bật, kana trong phạm vi).
2. **Thẻ đến hạn:** thẻ đã lưu, đủ điều kiện, `dueAt ≤ now`, sắp theo `dueAt` tăng dần (trễ nhất trước), tối đa `limit`.
3. **Thẻ mới:** nếu còn chỗ, bổ sung tối đa `min(limit − số đến hạn, study.newCardsPerDay − số thẻ có introducedDay = hôm nay)` mục đủ điều kiện chưa có thẻ. Thứ tự theo `study.newOrder`: nguồn nội dung đóng gói
   đi theo loại rồi thứ tự dạy học (`KANA_WRITING, KANA_READING, VOCAB_MEANING, VOCAB_READING`); thẻ tự soạn theo thứ tự soạn (chiều xuôi, rồi chiều ngược nếu bộ bật `reverse`).

Trả `{ content, dueCount, newCount }`. Hạn mức thẻ mới mặc định là **10/ngày** (`NEW_CARDS_PER_DAY`), người học đổi được.

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

`avgScore` được làm tròn và kẹp trong 0..100. Ký tự không tồn tại ném lỗi. Luyện viết luôn ghi tiến độ bất kể nguồn "Viết kana" của hàng ôn đang bật hay tắt.

### 5.4 Quiz — `submitQuiz(state, quizId, answers, durationMs, clock)`

Chấm toàn bộ câu của đề: đúng khi `correctAnswer` khớp câu trả lời sau khi bỏ khoảng trắng hai đầu, **không phân biệt hoa thường**; câu thiếu = sai.
`score = round(100 · đúng / tổng số câu của đề)`. XP = `20 + 5·đúng`, cộng vào hoạt động ngày, xét huy hiệu `QUIZ_SUBMITTED`.
Giao diện chỉ cho nộp một lần mỗi lượt (kể cả khi hết giờ trùng lúc bấm nộp).

### 5.5 Tiến độ hiển thị

- **Lưới kana** (`kanaProgress`): mỗi ký tự một ô — `level 0` chưa học · `1` đang học (LEARNING/RELEARNING) · `2` đã qua bước học (REVIEW); kèm `bestScore`, `dueAt`.
- **Tổng hợp** (`summaryOf`): `kanaLearned` = số thẻ viết đã có · `kanaMastered` = thẻ viết ở REVIEW với `stability ≥ 21` ngày · `dueToday` = số thẻ có `dueAt ≤ now` **và** đủ điều kiện như hàng đợi (nguồn đang bật), để khớp với số thẻ thật sự vào phiên ôn.
- **Heatmap** (`heatmapOf(state, days)`): `days` ngày gần nhất, từ cũ đến mới, ngày trống có `xp = 0`.

---

## 6. Chấm điểm nét viết

Cài trong `web/src/lib/stroke-match.ts`, thuần hàm, không chạm DOM. Mọi toạ độ tính trong hệ 109×109 của KanjiVG (1 đơn vị ≈ 0,92% cạnh ô).

```
U = lấy lại 24 điểm cách đều theo ĐỘ DÀI CUNG của nét người dùng
T = lấy lại 24 điểm cách đều theo ĐỘ DÀI CUNG của nét mẫu

fwd   = trung bình dist(U[i], T[i])          // sai lệch khi ghép xuôi
rev   = trung bình dist(U[i], T[23 - i])     // khi ghép ngược — CHỈ để chẩn đoán
ratio = độ dài nét vẽ / độ dài nét mẫu

score = clamp( round( 100 − fwd·4,2 − |ln(clamp(ratio, 0,05, 20))|·15 ), 0, 100 )
```

- **Vì sao lấy mẫu theo độ dài cung:** hai người vẽ cùng một nét với tốc độ và số điểm khác nhau hoàn toàn. Chuẩn hoá theo độ dài cung đưa cả hai về cùng một
  tham số hoá nên so từng cặp điểm là hợp lệ — rẻ hơn DTW rất nhiều mà kết quả tương đương cho nét đơn.
- **Điểm luôn tính theo chiều xuôi, tuyệt đối không lấy `min(fwd, rev)`:** lấy min sẽ vô tình thưởng điểm cho nét vẽ ngược chiều.
- **Không dùng nhận dạng cử chỉ kiểu `$1`/`$P`:** chúng bất biến với phép xoay và tỉ lệ, trong khi tập viết thì *vị trí trong ô và kích thước nét chính là thứ cần chấm*.
- `fwd = 3` ≈ lệch 2,8% cạnh ô. Muốn siết hay nới độ khó, chỉnh hằng số 4,2 và hai ngưỡng.

**Nguyên nhân lỗi (`reason`)**, xét theo thứ tự: `REVERSED` nếu `rev < fwd − 1,2` · `TOO_SHORT` nếu `ratio < 0,5` · `TOO_LONG` nếu `ratio > 1,9` · `OFF_PATH` nếu `fwd > 15`.

**Ngưỡng chấp nhận một nét** (`PASS_THRESHOLD`): `TRACE` (có nét mờ) = **58**, `TEST` (tự viết) = **48**.

**Quy trình của `StrokeStage`:**

1. Bỏ điểm cách điểm trước dưới 0,6 đơn vị (lọc rung tay); nét dưới 3 điểm hoặc dài dưới 4 đơn vị là chạm nhầm — không chấm.
2. Nét đạt → ghi mực, sang nét kế. Khi đủ nét: `avgScore` = trung bình điểm các nét đạt, `strokeErrors` = mọi lỗi đã ghi nhận → `recordWriting` (§5.3).
3. Nét trượt → so tiếp với **các nét khác của cùng chữ**; nếu khớp một nét khác trên `max(55, score + 15)` thì báo *"Nét đó là nét số 6 — hãy viết nét số 2 trước"* và ghi `OFF_PATH`.
   Viết sai thứ tự là lỗi phổ biến nhất của người mới, và biết mình sai ở đâu quan trọng hơn con điểm.
4. Trượt liên tiếp ở cùng một nét (`HINT_AFTER_MISSES`): `TRACE` 2 lần → tự phát lại hoạt ảnh nét đó; `TEST` 3 lần → hiện nét mẫu của riêng nét đó (tô đỏ, có số thứ tự) và phát hoạt ảnh, nét mẫu ẩn lại khi nét đó đạt.
5. Chế độ `TEST` (Tự viết) là bảng trắng: không tự chạy hoạt ảnh khi mở chữ, không có nút xem mẫu / so sánh / hé nét cho tới khi viết xong cả chữ. Nét mẫu chỉ hiện theo bước 4.

---

## 7. Nhập liệu bằng con trỏ

Khung viết dùng Pointer Events thống nhất chuột / cảm ứng / bút (Apple Pencil, Wacom), `touch-action: none` trên khung (`touch-none` của Tailwind) để không bị cuộn trang khi viết,
`setPointerCapture` để nét không đứt khi tay vượt ra ngoài khung, canvas nhân theo `devicePixelRatio` (tối đa 3).

**Cổng con trỏ** (`web/src/lib/pointer-gate.ts`) bảo đảm tại mỗi thời điểm chỉ MỘT con trỏ được viết. Nếu không, lòng bàn tay hoặc ngón thứ hai chạm giữa nét sẽ đặt lại danh sách điểm,
trộn điểm của hai con trỏ vào một nét, và `pointercancel` bị coi như người học đã nhấc tay.

| Sự kiện | Kết quả |
|---|---|
| `pointerdown` khi chưa có con trỏ nào | Bắt đầu nét mới (`start`) |
| `pointerdown` thứ hai (ngón thứ hai, lòng bàn tay chạm sau) | **Bỏ qua** — nét đang viết giữ nguyên |
| `pointerdown` của **bút** khi đang có nét **cảm ứng** dở | Bỏ nét cảm ứng, viết lại bằng bút (`restart`): lòng bàn tay thường chạm xuống trước bút |
| `pointerdown` của chuột bằng nút phải/giữa | Bỏ qua |
| `pointerdown` lại của chính con trỏ đang viết (sự kiện `up` đã thất lạc) | Viết lại (`restart`) thay vì kẹt |
| `pointermove` / `pointerup` của con trỏ khác | Bỏ qua |
| `pointerup` của con trỏ đang viết | Hoàn tất nét → chấm điểm (§6) |
| `pointercancel` hoặc `lostpointercapture` của con trỏ đang viết | **Bỏ nét dở, KHÔNG chấm** (hệ điều hành giành lại cử chỉ — người học không chủ động nhấc tay) |
| Đổi chữ / "Xoá làm lại" | `reset()` nhả cổng |

`setPointerCapture` được bọc `try/catch`: nó ném lỗi khi con trỏ không còn hoạt động, và nét vẫn phải viết được.

---

## 8. PWA và chế độ offline

**Cài đặt được.** `web/src/app/manifest.ts` sinh `/manifest.webmanifest`: `id "/"`, `start_url "/bang-dieu-khien"` (người đã cài là người quay lại học), `scope "/"`, `display "standalone"`,
`lang "vi"`, icon 192 và 512 (`any`) cùng 512 `maskable` ở `web/public/icons/`, và bốn `shortcuts` (Luyện viết, Luyện gõ, Ôn tập, Quiz). Icon cảm ứng iOS là `web/src/app/apple-icon.png` (180×180, nền đặc —
iOS tự bo góc); `/favicon.ico` (16/32/48, `web/public/`) chỉ để các trình khách tự xin tệp này không nhận 404 — trang khai báo `icon.svg`; `appleWebApp` trong metadata thêm meta `mobile-web-app-capable`, tiêu đề và kiểu thanh trạng thái cho Safari iOS (việc mở toàn màn hình trên các bản iOS cũ dựa vào meta này,
chưa được kiểm trên thiết bị thật). Chrome/Edge cần HTTPS (hoặc `localhost`), manifest và icon 192/512; service worker không bắt buộc để cài được.

**Service worker** (`web/scripts/sw.template.js`, sinh thành `out/sw.js` bởi `web/scripts/build-sw.mjs` ngay sau `next build`):

| Hạng mục | Quy tắc |
|---|---|
| Precache | Mọi tệp trong `out/` **trừ** `sw.js`, `404.html`, `*.map`, `robots.txt`, `sitemap.xml`, `.gitkeep`. `404.html` bị loại vì Nginx chỉ phục vụ nó nội bộ (`internal`): tải trực tiếp trả 404 và làm hỏng cả lần cài đặt |
| Dạng URL | `encodeURI` của đường dẫn tệp — đúng dạng Next ghi vào HTML. Chunk của `quiz/[id]` được yêu cầu là `quiz/%5Bid%5D/…`; khoá ghi `[id]` sẽ không bao giờ khớp |
| Tên cache | `kd-<12 ký tự hex>` — băm từ **nội dung** mọi tệp precache (đổi nội dung là đổi phiên bản, kể cả khi tên tệp giữ nguyên) |
| `install` | Tải sẵn mọi URL với `cache: "reload"` (bỏ qua cache HTTP). **Chỉ cần một URL không trả 200 là cả lần cài đặt thất bại** (app chỉ mất offline, không hỏng). **Không** gọi `skipWaiting()` |
| `activate` | Xoá mọi cache `kd-*` khác bản hiện tại (không đụng cache không phải của mình), rồi `clients.claim()` |
| `fetch` | Chỉ xử lý GET cùng origin, trừ `/sw.js`. Tra cache bằng `pathname` (bỏ dấu `/` cuối và query: `/luyen-viet?c=あ`, `…txt?_rsc=…` đều khớp) → trúng thì trả từ cache, không đi mạng |
| Trượt cache | Đi mạng và giữ nguyên mã trạng thái (404 vẫn là 404). Mất mạng + là điều hướng trang → trả trang chủ; tài nguyên khác → để lỗi mạng nổi lên |
| Cập nhật | Bản mới cài song song ở nền; chỉ activate khi mọi tab của bản cũ đã đóng, nên HTML và JS của một phiên luôn cùng một bản build |

**Đăng ký.** `ServiceWorkerRegister` (trong root layout) chỉ đăng ký ở bản production; ở `next dev` nó **gỡ** mọi service worker còn sót từ lần xem thử bản build trên cùng origin.

**Trải nghiệm cài đặt.** Thẻ "Cài ra màn hình chính" ở `/cai-dat` (`InstallCard`, nhận diện bằng `lib/pwa.ts`): đã cài → xác nhận; Chrome/Edge có `beforeinstallprompt` → nút cài; iPhone/iPad → hướng dẫn Chia sẻ → Thêm vào Màn hình chính;
còn lại → chỉ dẫn qua menu trình duyệt.

> **iOS: kho dữ liệu của bản đã cài tách biệt với Safari** (WebKit cố ý cô lập `localStorage`, IndexedDB, service worker, cache). Người dùng cài xong sẽ thấy tiến độ trống và phải
> *Tải tiến độ về máy* ở Safari rồi *Khôi phục từ tệp* trong app. Đổi lại, bản đã cài được miễn quy tắc xoá dữ liệu sau 7 ngày không tương tác của Safari.

**Kiểm chứng.** Logic của service worker được test bằng cách chạy mã mẫu thật trong Node với Cache API giả (`web/scripts/sw.test.mjs`); `scripts/smoke-test.sh` kiểm manifest, icon, và rằng *mọi* URL trong precache trả 200.
Vòng đời service worker trong trình duyệt thật chưa được kiểm tự động.

---

## 9. Quyền riêng tư và bảo mật

1. Không có tài khoản, không có máy chủ nhận dữ liệu: tiến độ, ghi chú, bộ thẻ và mọi thứ người học tự soạn không bao giờ được gửi đi đâu.
2. Không có cookie, không có bộ theo dõi. Tài nguyên ngoài duy nhất là font từ Google Fonts (service worker không chặn nó; offline thì dùng font hệ thống).
3. Dữ liệu từ bên ngoài (tệp nhập) luôn đi qua zod trước khi vào trạng thái; dữ liệu trong `localStorage` cũng vậy khi nạp. Văn bản người dùng tự soạn (ghi chú, thẻ, câu gõ) chỉ được hiển thị bằng phần tử React dựng từ cây dữ liệu, không bao giờ qua `dangerouslySetInnerHTML` (§2.3).
4. Đáp án quiz có trong bundle — quiz là công cụ tự học, không phải bài thi.
5. Header an toàn (`nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) do `web/nginx.conf` đặt; HSTS để bên đầu cuối TLS đặt.
