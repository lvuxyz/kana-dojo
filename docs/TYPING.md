# Phòng Luyện Gõ — nghiên cứu & thiết kế

Trang `/luyen-go`: người học gõ tiếng Nhật theo câu mẫu, được bấm giờ và chấm điểm như các bài thi gõ phím của Nhật
(e-typing, 寿司打). Tài liệu này ghi lại phần nghiên cứu (người Nhật gõ chữ thế nào, các kiểu bài luyện phổ biến),
các quyết định thiết kế và lý do.

> **Phạm vi:** phòng luyện gõ chạy **hoàn toàn trên trình duyệt**, như phần còn lại của site (không tài khoản, không máy chủ):
> chấm điểm tại chỗ; kỷ lục, lịch sử và chữ hay sai lưu ở `localStorage`; **không cộng XP/streak**. Các quyết định khi gộp vào
> site tĩnh (và vì sao) ở §3.4.

---

## 1. Người Nhật gõ chữ bằng cách nào

### 1.1 Các cách nhập (入力方式)

| Cách nhập | Cách hoạt động | Mức phổ biến | Trong Kana Dōjō |
|---|---|---|---|
| **ローマ字入力** — romaji | Gõ phiên âm Latin, bộ gõ IME đổi ra kana: `ka` → か | Cách phổ biến nhất trên máy tính | ✅ `ROMAJI` |
| **かな入力** — kana JIS | Mỗi phím in sẵn một kana (bố cục JIS X 6002); ゛゜ là phím riêng gõ sau chữ gốc | Thiểu số, chủ yếu người dùng lâu năm; ít phím hơn romaji khi đã thuộc | ✅ `KANA` |
| **かな漢字変換** — IME | Gõ cách đọc rồi nhấn Space để đổi sang kanji/katakana, Enter để chốt | Mọi văn bản thật đều đi qua bước này | ✅ `IME` |
| **フリック入力** — flick | Bàn phím 12 ô trên điện thoại, chạm hoặc vuốt theo 4 hướng để chọn kana | Phổ biến nhất trên điện thoại | ✅ qua `IME` (bàn phím điện thoại đưa chữ vào ô nhập) |
| **親指シフト / NICOLA** | Kana + phím ngón cái, cần bố cục hoặc phần mềm riêng | Rất hiếm | ❌ không làm |
| **AZIK / romaji mở rộng** | Romaji rút gọn (`kz` → かん…) | Ngách, người gõ chuyên | ❌ chưa làm — kiến trúc bảng ứng viên cho phép thêm sau |

Kết luận cho người Việt học tiếng Nhật: **romaji là mặc định** (dùng lại bàn phím US quen thuộc, đúng như gõ máy thật);
**IME** cần thiết khi gõ câu có kanji và là cách duy nhất khả thi trên điện thoại; **kana JIS** là lựa chọn nâng cao —
dành cho người có bàn phím Nhật in sẵn chữ kana, không đặt làm mặc định.

### 1.2 Các kiểu bài luyện phổ biến

| Kiểu bài | Nguồn cảm hứng | Trong Kana Dōjō |
|---|---|---|
| 課題文 — gõ một đoạn cố định, bấm giờ tới khi xong | e-typing | Chế độ **Bài mẫu** (`PASSAGE`, 5/10/20 câu) |
| タイムアタック — gõ được càng nhiều càng tốt trong thời gian cho trước | 寿司打 (đĩa sushi trôi trên băng chuyền) | Chế độ **Đua giờ** (`TIME_ATTACK`, 30/60/120 giây) |
| 一発勝負 — sai một phím là kết thúc | các chế độ "ミス即終了" | Chế độ **Sinh tử** (`SUDDEN_DEATH`) |
| 漢字かな交じり文 — hiện câu có kanji kèm cách đọc, gõ theo cách đọc | 寿司打, e-typing | Nội dung **Kanji có furigana** |
| Chuỗi kana rời để làm quen phím | các trang タイピング練習 cho người mới | Nội dung **Kana ngẫu nhiên** (chọn nhóm: cơ bản / biến âm / âm ghép / tất cả) |
| 苦手克服 — luyện lại đúng chữ hay sai | thống kê phím yếu của các trò luyện gõ | Nội dung **Chữ hay sai** + nút **Luyện lại các câu có lỗi** |
| 聞き取りタイピング — nghe rồi gõ lại | bài luyện nghe ngoại ngữ | Tuỳ chọn **Nghe chép** (che chữ, đọc bằng giọng ja-JP) |

Ba trục độc lập nên người học tự phối: **3 cách nhập × 6 loại nội dung × 3 chế độ**, cộng tuỳ chọn ẩn furigana,
gợi ý khi bị kẹt và nghe chép.

### 1.3 Nguyên tắc: màn gõ chỉ có tiếng Nhật

Mục tiêu là **rèn trí nhớ**, không phải chép lại. Màn gõ không hiện romaji mẫu, không gợi ý phím kế tiếp, không có bàn phím
ảo — người học dùng bàn phím thật và tự nhớ cách gõ từ chữ Nhật. Màn gõ chỉ phản chiếu các phím đã bấm của cụm chưa thành
chữ (`sh` trước khi thành し), giống ô ghép chữ của IME. Nghĩa tiếng Việt xem ở màn kết quả; bảng luật ở mục 1.4 được tóm tắt
ở màn chọn bài để tra **trước** khi gõ.

Để "chỉ tiếng Nhật" không biến thành ngõ cụt, ba cơ chế đi kèm:

| Cơ chế | Cách hoạt động |
|---|---|
| **Gợi ý khi bị kẹt** (bật sẵn, tắt được) | Sai 3 lần liên tiếp ở cùng một chữ mới hiện ヒント cho riêng chữ đó (`ま → ma`; kana JIS kèm phím: `か · T`, `゛ · [`), gõ qua là biến mất. Kanji đang ẩn furigana thì bậc 1 chỉ hé furigana của cụm đó (tô vàng — vẫn là tiếng Nhật), sai thêm 3 lần mới hiện cách gõ. Chữ phải nhờ gợi ý được liệt kê ở màn kết quả. |
| **Ẩn furigana** (bài Kanji) | Furigana chỉ hiện sau khi gõ đúng cả cụm — luyện nhớ cách đọc kanji thay vì đọc hiragana nhỏ phía trên. |
| **Vòng luyện điểm yếu** | Mọi chữ gõ sai được cộng vào danh sách "Chữ hay sai"; mỗi lượt danh sách giảm 15% nên một lần sai tự rơi khỏi danh sách sau 5 lượt không sai lại. Nội dung **Chữ hay sai** sinh câu từ danh sách này, rút theo căn bậc hai số lần sai (chữ yếu nhất ra nhiều hơn mà câu không đơn điệu). Màn kết quả có nút **Luyện lại các câu có lỗi** — lượt đó không tính kỷ lục. |

### 1.4 Luật romaji của IME — chỗ người Việt hay vấp

Bộ máy chấp nhận **mọi** cách gõ mà MS-IME/Google 日本語入力 chấp nhận, để tay quen ở đây thì sang máy thật gõ y hệt.

| Kana | Chấp nhận | Ghi chú |
|---|---|---|
| し ち つ ふ じ | `shi/si/ci` · `chi/ti` · `tsu/tu` · `fu/hu` · `ji/zi` | |
| ぢ づ | `di` · `du` | gõ `ji`/`zu` sẽ ra じ/ず |
| を · trợ từ は, へ | `wo` · `ha`, `he` | gõ theo mặt chữ, không theo cách đọc |
| ん | `nn`, `xn`, `n'`; **một chữ `n`** chỉ khi phím sau là phụ âm khác `n`, `y` | こんにちは = `konnnichiha` — vì `konnichiha` trong IME ra こんいちは. Cuối câu phải `nn` |
| っ | gấp đôi phụ âm sau (`kitte`), hoặc `xtu/ltu/xtsu/ltsu` | っち: `cchi`, `tti`, `tchi` |
| きゃ… | `kya`, hoặc tách `ki` + `xya/lya` | しゃ `sha/sya`, ちゃ `cha/cya/tya`, じゃ `ja/jya/zya` |
| ぁぃぅぇぉゃゅょ | tiền tố `x` hoặc `l` | |
| ー | `-` | コーヒー = `ko-hi-` |
| Katakana mở rộng | ファ `fa` · ティ `thi` · ディ `dhi` · デュ `dhu` · ウィ `wi` · ウェ `we` · ウォ `who` · ヴァ `va` · シェ `she` · ジェ `je` · チェ `che` · ツァ `tsa` · クァ `kwa/qa` · トゥ `twu` | |

Dấu câu (、。！？「」, khoảng trắng) được hiển thị nhưng **không phải gõ**, như 寿司打 — để người học tập trung vào kana.

---

## 2. Chấm điểm

| Chỉ số | Công thức | Ghi chú |
|---|---|---|
| Phím/phút (KPM, 打鍵/分) | phím đúng × 60 000 / thời gian (ms) | Thước đo chuẩn của các bài kiểm tra gõ phím tiếng Nhật |
| Kana/phút | kana đã gõ xong / phút | Dễ hình dung hơn với người mới |
| Độ chính xác | phím đúng / (phím đúng + phím sai) | |
| **Điểm** | `round(KPM × chính xác³)` | Cách chấm của e-typing: chính xác 90% chỉ còn 73% điểm → khuyến khích gõ chắc trước, nhanh sau |
| Điểm sinh tử | số phím đúng liên tiếp trước khi sai | Chế độ này đo độ bền, không đo tốc độ |

Đồng hồ bắt đầu ở **phím đầu tiên** (không tính thời gian đọc đề); chế độ đua giờ cắt đúng mốc giới hạn.
Phím sai **bị từ chối và không làm đổi trạng thái** — không cần Backspace, giống mọi trò gõ phím Nhật.

### Thang đai (theo chủ đề "đạo trường")

| Điểm | Đai | | Điểm | Đai |
|---|---|---|---|---|
| 0+ | 白帯 Đai trắng | | 260+ | 黒帯 Đai đen |
| 60+ | 黄帯 Đai vàng | | 330+ | 師範 Sư phụ |
| 100+ | 緑帯 Đai xanh lá | | 400+ | 達人 Cao thủ |
| 150+ | 青帯 Đai xanh dương | | 500+ | 名人 Bậc thầy |
| 200+ | 茶帯 Đai nâu | | | |

Mốc tham khảo khi đặt thang: người mới học kana thường dưới 60 phím/phút; người Nhật dùng máy tính hằng ngày
khoảng 150–250; người gõ thi đấu vượt 400.

### Kỷ lục và lịch sử (lưu cục bộ)

- Kỷ lục cá nhân tách theo tổ hợp **cách nhập × nội dung × chế độ**: điểm cao nhất, tốc độ cao nhất, độ chính xác cao
  nhất và số lượt. Màn chọn bài hiện kỷ lục của tổ hợp đang chọn và 5 lượt gần nhất.
- Lưu ở `localStorage` qua `web/src/lib/typing/history.ts`, khoá `kd.typing.history.v1` (cùng tiền tố `kd.` với
  `kd.progress.v1`; không có tài khoản nên một trình duyệt là một kỷ lục). Giữ 10 lượt gần nhất và tối đa 40 chữ yếu.
  Dữ liệu hỏng được giữ lại ở `kd.typing.history.corrupt` rồi bắt đầu lại (như tiến độ chính); một mục kỷ lục/lượt sai hình dạng
  thì chỉ bỏ riêng mục đó. Trình duyệt chặn lưu trữ (ẩn danh) hoặc đầy bộ nhớ thì vẫn chơi được, chỉ không nhớ kỷ lục — trang kết quả
  báo "chưa lưu được" thay vì "lưu trên trình duyệt này".
- Kỷ lục luyện gõ **lưu riêng**, chưa nằm trong tệp sao lưu tiến độ ([SPEC §2.1](SPEC.md#21-tệp-sao-lưu)) — trang Cài đặt nói
  rõ điều này. Nút *Xoá toàn bộ tiến độ* có xoá cả kỷ lục luyện gõ.
- Lượt chưa gõ đúng phím nào không được ghi. Lựa chọn lần trước (nội dung, cách nhập, chế độ…) cũng được nhớ trên máy.

---

## 3. Thiết kế kỹ thuật

```
web/src/lib/typing/
├── romaji.ts       Bảng kana → cách gõ (luật IME), romajiCandidates(), toRomaji()
├── kana-layout.ts  Bố cục かな入力 JIS theo KeyboardEvent.code, tách ゛゜
├── engine.ts       TypingRun — so khớp phím với các ứng viên tại vị trí hiện tại
├── phrases.ts      Phân tích {kanji|cách đọc}, nguồn câu vô tận không lặp
├── ime.ts          Chế độ IME: chuẩn hoá, so khớp, quy đổi số phím
├── history.ts      Kỷ lục & lịch sử trên localStorage (hàm thuần + lớp đọc/ghi)
└── score.ts        KPM, độ chính xác, điểm, thang đai
web/src/components/typing/
├── useTypingGame.ts   Trạng thái một ván: đồng hồ, đếm phím, điểm yếu, kết thúc
├── TypingSetup/Stage/Result.tsx, PhraseView.tsx, useSpeech.ts
web/src/data/typing-texts.ts   Kho câu mẫu
web/src/app/(app)/luyen-go/    Trang: chọn bài → gõ → kết quả
```

### 3.1 Bộ máy so khớp

Tại mỗi vị trí trong chuỗi kana có một danh sách **ứng viên** `{keys, len}` — chuỗi phím và số kana nó phủ
(`きゃ` có `kya` phủ 2 kana và `ki` phủ 1 kana). Người học gõ phím nào, bộ máy giữ phần đã gõ của cụm đang dở và chấp nhận
nếu còn ít nhất một ứng viên bắt đầu bằng chuỗi đó; khi một ứng viên khớp trọn thì tiến `len` kana.

Hai trường hợp phụ thuộc kana phía sau được biến thành **ứng viên ghép** khi tính danh sách từ cuối câu ngược lên:

- ん + cụm sau: `"n" + ứng viên của cụm sau`, chỉ khi ứng viên đó không bắt đầu bằng nguyên âm, `y`, `n` hoặc `'`;
- っ + cụm sau: phụ âm đầu gấp đôi + ứng viên của cụm sau (thêm `t` trước `ch`).

Nhờ vậy không cần trạng thái riêng hay quay lui cho ん/っ. Chế độ kana JIS dùng lại đúng bộ máy này, chỉ khác bảng ứng viên
(が → token `か` rồi `゛`).

### 3.2 Đọc phím — những bẫy thực tế

- **Romaji/kana nghe `keydown` ở cấp `window`**, không qua ô nhập nào — khi không có ô soạn thảo được focus, IME của hệ
  điều hành thường không chen vào, nên người học khỏi phải tắt IME. Nếu vẫn thấy `key === "Process"`/`keyCode 229` thì hiện
  hướng dẫn tắt IME.
- **Unikey/EVKey (Telex)** biến `aa`, `w`, `dd` thành `â`, `ư`, `đ`. Gặp chữ Latin có dấu, trang bỏ qua phím đó (không tính
  sai) và nhắc chuyển bộ gõ sang tiếng Anh — lỗi rất hay gặp với người Việt.
- Kana JIS đọc theo `KeyboardEvent.code` (vị trí phím) chứ không theo `key`. Bàn phím US thiếu hai phím ¥ và ろ của JIS:
  phím `` ` `` thay cho ー, `` Shift + ` `` thay cho ろ; màn chọn bài ghi chú điều này khi chọn kana JIS.
- Bỏ qua phím giữ lặp (`repeat`) và tổ hợp Ctrl/Alt/Meta. Space đọc lại câu, Esc thoát.
- **IME**: so chữ đã chốt (sau NFKC, bỏ dấu câu) với chữ hiển thị kể cả kanji; chỉ đánh giá khi hết ghép chữ
  (`compositionend` hoặc `input` không `isComposing`). Mỗi lần chuyển từ "khớp" sang "có chữ sai" tính một lỗi.
  Vì IME nuốt hết phím, số phím được **quy đổi** ra số phím romaji tối thiểu của phần đã khớp — KPM và điểm vẫn so được
  với hai cách nhập kia.
- Trên màn hình cảm ứng (`pointer: coarse`) không có sự kiện phím vật lý: trang gợi ý chọn "Bộ gõ IME" để gõ flick.
- Nghe chép dùng Web Speech API với giọng `ja-JP`; máy chưa cài giọng tiếng Nhật thì báo cách cài trên Windows.

### 3.3 Kho câu

`web/src/data/typing-texts.ts` — 137 câu: 36 hiragana, 44 katakana (từ ngoại lai, có Phở フォー, Áo dài アオザイ,
Bánh mì バインミー), 25 hỗn hợp, 32 câu kanji; kèm nghĩa tiếng Việt. Kanji viết `{日本語|にほんご}` để vừa hiện furigana
vừa biết phải gõ gì. Kana ngẫu nhiên lấy từ `kana-data.json` theo nhóm đã chọn (46 cơ bản, 25 biến âm, 33 âm ghép mỗi bảng).

Câu mẫu đóng gói sẵn ở frontend: nội dung cố định, không cần gọi máy chủ.
Thêm câu mới chỉ cần sửa file này — test `phrases.test.ts` tự kiểm tra mọi câu **gõ trọn được bằng cả romaji lẫn kana JIS**
và đúng loại chữ của nhóm.

### 3.3.1 Câu do người học tự soạn

Nội dung `MINE` ("Câu của tôi") lấy câu từ không gian riêng (`Space.library.texts`, soạn ở Thư viện › Câu luyện gõ), dùng đúng cú pháp `{漢字|かんじ}` của kho câu mẫu và đi qua cùng bộ máy gõ.
Vì một câu không gõ được (kanji trần, chữ Latin, ký hiệu lạ) làm ván kẹt vĩnh viễn, `validateTypingText` (`lib/typing/phrases.ts`) chặn nó **từ lúc soạn** với lý do bằng tiếng Việt, và `userPhrases` lọc lại lần nữa lúc dựng ván
(tệp sao lưu sửa tay cũng không làm kẹt). Test `phrases.test.ts` kiểm rằng mọi câu mà `validateTypingText` nhận đều gõ trọn được bằng cả romaji lẫn kana JIS. Chưa có câu nào thì ván dùng kana ngẫu nhiên.
Kỷ lục theo tổ hợp (cách nhập × nội dung × chế độ) coi `MINE` là một nội dung như các loại khác.

**Nhập văn bản** (`lib/typing/import.ts`, giao diện `components/library/TextImport.tsx`): ngay trong phòng luyện gõ — chọn "Câu của tôi" sẽ hiện khung *Nhập văn bản để luyện gõ* (`TextImportPanel`, mở sẵn khi chưa có câu nào) — và ở Thư viện › Câu luyện gõ.
Người học dán cả đoạn văn, chọn hoặc kéo thả tệp `.txt` (UTF-8, không phải UTF-8 thì đọc theo Shift_JIS; tối đa 256 KB):

- Dòng không có nghĩa được **tự tách câu** sau 。！？!?… (kèm dấu đóng ngoặc theo sau), không bao giờ cắt giữa cụm `{漢字|かんじ}`.
- Dòng `câu | nghĩa` hoặc `câu<Tab>nghĩa` (dán từ Excel) giữ nguyên một câu kèm nghĩa; `|` nằm trong cụm kanji không bị coi là dấu ngăn.
- Bỏ dòng trống, dòng `#…`, câu trùng; katakana nửa độ rộng (ｺｰﾋｰ) đổi về katakana thường. Câu dài hơn `LIMITS.text` bị chặn kèm lời nhắc ngắt câu.
- Mỗi câu qua `validateTypingText` (riêng kanji trần được báo gọn: `Kanji “水” chưa có cách đọc — viết {水|…}`); bảng xem trước đếm câu gõ được / cần sửa và chỉ ra lý do. Bấm *Thêm* chỉ nhập câu gõ được (`addTexts` ở `lib/space/library.ts`
  bỏ câu đã có, không vượt `LIMITS.texts`); **câu cần sửa ở lại trong ô** để người học thêm cách đọc rồi nhập tiếp.

Không tự sinh furigana cho kanji trần: việc đó cần từ điển hình thái (kuromoji… vài MB), không hợp với site tĩnh nhẹ — người học tự viết `{漢字|かんじ}`.

### 3.4 Quyết định khi gộp vào site không tài khoản

Phòng luyện gõ được viết lúc site còn có backend và tài khoản (nhánh `claude/japanese-text-input-feature-df8fd6`, PR #2,
kèm một bản làm dở `claude/typing-sessions-backend`). Khi gộp vào site tĩnh hiện tại, các điểm sau được chốt:

| Chủ đề | Quyết định | Lý do |
|---|---|---|
| Lưu trữ | `kd.typing.history.v1` (+ `.corrupt`), `kd.typing.config` cho lựa chọn lần trước | Cùng quy ước `kd.` với `kd.progress.v1` / `kd.theme` (SPEC §2.2) |
| Tài khoản | Không. Bỏ hậu tố id tài khoản khỏi khoá | Site không có tài khoản (SPEC §0) |
| Máy chủ | Bỏ hết mã backend và đồng bộ (Java, bảng `typing_sessions`, `server-sync.ts`) | Backend đã gỡ khỏi `master`; mã còn nguyên trong lịch sử git (bên dưới) |
| XP, streak | **Không cộng** | Chuỗi ngày được quảng bá là "đạt mục tiêu bằng nét viết thực thụ"; cộng XP từ luyện gõ là đổi nghĩa của nó và đổi engine (xem dưới) |
| Bàn phím ảo | Không có | Nguyên tắc "chỉ tiếng Nhật" (§1.3). Bản làm dở có `VirtualKeyboard.tsx`, đã bỏ |
| Sao lưu | Chưa nằm trong tệp sao lưu | Giữ nguyên hợp đồng `ProgressState` v1 giữa web và mobile (SPEC §2) |
| Xoá | *Xoá việc học* và *Xoá sạch mọi thứ* (Cài đặt › Dữ liệu) đều xoá cả kỷ lục luyện gõ | Một nút, một lời hứa |
| Điều hướng | Mục "Luyện gõ" đứng cạnh "Luyện viết"; không đưa lại "Xếp hạng", "Hồ sơ" | Hai mục đó thuộc bản có tài khoản |

**Đã chốt 2026-10-02:** giữ nguyên hai điểm *XP, streak* và *Sao lưu* ở bảng trên. Xem lại khi bắt đầu làm bản mobile hoặc khi thêm nhật ký ôn (`STATE_VERSION` 2), lúc đó đổi định dạng tệp một lần.

**Lấy lại mã đã gỡ** (đều nằm trong lịch sử của `master` sau khi gộp):

```bash
git show 0d9b50b --stat                                  # bản giữ mã đồng bộ máy chủ dưới dạng comment (Java, SQL, server-sync.ts)
git show 0d9b50b:web/src/lib/typing/server-sync.ts       # client đồng bộ
git show b73497c:web/src/components/typing/VirtualKeyboard.tsx   # bàn phím ảo của bản làm dở
```

**Nếu sau này muốn cộng XP/streak:** quy tắc của mã cũ là `min(50, 5 + phím đúng / 10)`, dưới 20 phím đúng thì 0 (tỉ lệ với công
sức nên chia nhỏ lượt gõ không cày được XP), không tính lượt luyện lại câu có lỗi. Làm ở phía client: thêm `typingDelta` và một
thao tác `recordTyping` ở `lib/learning/` gọi `recordActivity` như `quiz.ts` — không đổi schema. Phải đồng thời sửa lời ở trang
Tổng quan về chuỗi ngày, SPEC §4.1, và thêm fixture (mobile phải làm đúng như web — xem MOBILE_FLUTTER.md, mục 5.6).

**Nếu muốn đưa kỷ lục vào tệp sao lưu:** từ khi có tệp sao lưu bọc (định dạng 2, `lib/backup.ts`, SPEC §2.1) đường rẻ nhất là thêm một phần `typing` vào tệp bọc — **không** đụng `ProgressState` v1 nên không chạm
hợp đồng web ↔ mobile. Phần việc còn lại: đọc/ghi `lib/typing/history.ts` từ `backup.ts` (kèm kiểm tra bằng `parseHistoryStrict`), tăng `BACKUP_FORMAT` lên 3 nếu muốn bản cũ từ chối rõ ràng thay vì bỏ qua khoá lạ,
và cập nhật lời ở Cài đặt › Dữ liệu. Quyết định *giữ nguyên* ngày 2026-10-02 vẫn đang có hiệu lực; mục này chỉ ghi lại cách làm khi muốn đổi.

### 3.5 Kiểm thử

| Tầng | Test |
|---|---|
| Web — `engine.test.ts` | Mọi biến thể romaji, luật ん/っ, âm ghép, katakana mở rộng, phím "lẽ ra phải bấm" và cách gõ cụm đang dở (cho gợi ý) bám theo cách người học đang gõ, nhãn phím JIS cho gợi ý, phím sai không đổi trạng thái, bố cục JIS và phím thay thế trên bàn phím US |
| Web — `phrases.test.ts` | Phân tích furigana; **từng câu trong kho** gõ trọn bằng romaji và kana; nguồn câu không lặp; 600 chuỗi kana ngẫu nhiên đều gõ được; lọc đúng nhóm kana; "Chữ hay sai" chỉ rút từ danh sách yếu, đúng tỉ lệ; câu cố định gõ lần lượt |
| Web — `ime.test.ts` | Chuẩn hoá chữ IME (NFKC, bỏ dấu câu), so khớp chữ đã chốt, quy đổi số phím; cụm kanji chỉ tính khi đổi đúng trọn cụm |
| Web — `score.test.ts` | KPM, độ chính xác, điểm, sinh tử, thang đai |
| Web — `import.test.ts` | Tách câu sau 。！？ không cắt cụm kanji, dòng có nghĩa (Tab / `|` ngoài cụm), bỏ dòng trống/`#`/trùng, lý do cho câu không gõ được và câu quá dài, katakana nửa độ rộng, câu cần sửa viết lại rồi đọc lại y hệt, đọc tệp UTF-8 và Shift_JIS. `library.test.ts` kiểm `addTexts`: bỏ câu trùng, đếm câu hỏng, mã không trùng, vượt giới hạn thì không thêm gì |
| Web — `history.test.ts` | Kỷ lục theo tổ hợp, chỉ đổi khi điểm cao hơn, giới hạn số lượt gần đây, dữ liệu hỏng thì bắt đầu lại; chữ yếu cộng dồn, giảm dần và bỏ kanji; khoá cố định `kd.typing.history.v1`, dữ liệu hỏng giữ lại ở `.corrupt`, mục hỏng bị bỏ riêng lẻ (phần còn lại giữ nguyên), trình duyệt chặn hoặc đầy bộ nhớ thì không ném lỗi và `saveHistory` trả false để trang kết quả báo "chưa lưu được" |

---

## 4. Hướng phát triển

- **Xem lại** việc cộng XP/streak và đưa kỷ lục vào tệp sao lưu khi bắt đầu làm bản mobile hoặc thêm nhật ký ôn (đã chốt giữ nguyên ngày 2026-10-02, §3.4).
- **Nội dung từ vựng JLPT** lấy thẳng từ `/vocabulary` (đã có nghĩa tiếng Việt và câu ví dụ).
- Huy hiệu luyện gõ (đạt 黒帯, 100 lượt…) và bảng xếp hạng riêng theo chế độ.
- Bảng romaji tuỳ chỉnh (AZIK) — chỉ cần thêm một bảng ứng viên.
- Âm thanh phím, biểu đồ tiến bộ theo ngày.
