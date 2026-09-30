# Phòng Luyện Gõ — nghiên cứu & thiết kế

Trang `/luyen-go`: người học gõ tiếng Nhật theo câu mẫu, được bấm giờ và chấm điểm như các bài thi gõ phím của Nhật
(e-typing, 寿司打). Tài liệu này ghi lại phần nghiên cứu (người Nhật gõ chữ thế nào, các kiểu bài luyện phổ biến),
các quyết định thiết kế và lý do.

> **Phạm vi hiện tại:** tính năng chạy **hoàn toàn trên trình duyệt** — chấm điểm tại chỗ, kỷ lục và lịch sử lưu ở
> `localStorage` của máy đang dùng. Chưa có bảng CSDL hay API nào, chưa cộng XP/streak. Xem §4 về hướng đồng bộ lên tài khoản.

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
đáng có vì bàn phím ảo giúp người học thuộc bố cục, nhưng không đặt làm mặc định.

### 1.2 Các kiểu bài luyện phổ biến

| Kiểu bài | Nguồn cảm hứng | Trong Kana Dōjō |
|---|---|---|
| 課題文 — gõ một đoạn cố định, bấm giờ tới khi xong | e-typing | Chế độ **Bài mẫu** (`PASSAGE`, 5/10/20 câu) |
| タイムアタック — gõ được càng nhiều càng tốt trong thời gian cho trước | 寿司打 (đĩa sushi trôi trên băng chuyền) | Chế độ **Đua giờ** (`TIME_ATTACK`, 30/60/120 giây) |
| 一発勝負 — sai một phím là kết thúc | các chế độ "ミス即終了" | Chế độ **Sinh tử** (`SUDDEN_DEATH`) |
| 漢字かな交じり文 — hiện câu có kanji kèm cách đọc, gõ theo cách đọc | 寿司打, e-typing | Nội dung **Kanji có furigana** |
| Chuỗi kana rời để làm quen phím | các trang タイピング練習 cho người mới | Nội dung **Kana ngẫu nhiên** |
| 聞き取りタイピング — nghe rồi gõ lại | bài luyện nghe ngoại ngữ | Tuỳ chọn **Nghe chép** (che chữ, đọc bằng giọng ja-JP) |

Ba trục độc lập nên người học tự phối: **3 cách nhập × 5 loại nội dung × 3 chế độ**, cộng tuỳ chọn gợi ý phím,
bàn phím ảo và nghe chép.

### 1.3 Luật romaji của IME — chỗ người Việt hay vấp

Bộ máy chấp nhận **mọi** cách gõ mà MS-IME/Google 日本語入力 chấp nhận, để tay quen ở đây thì sang máy thật gõ y hệt.
Dòng gợi ý hiện cách ngắn gọn theo Hepburn và **tự đổi theo cách người học đang chọn** (gõ `s` rồi `i` thì gợi ý bỏ `h`).

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
- Lưu ở `localStorage` (khoá `kd.typing.history.v1`, giữ 10 lượt gần nhất) qua `web/src/lib/typing/history.ts`.
  Dữ liệu hỏng hoặc trình duyệt chặn lưu trữ (ẩn danh) thì vẫn chơi được, chỉ không nhớ kỷ lục.
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
├── TypingSetup/Stage/Result.tsx, PhraseView.tsx, VirtualKeyboard.tsx, useSpeech.ts
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
  phím `` ` `` thay cho ー, `` Shift + ` `` thay cho ろ; bàn phím ảo vẽ theo hình US và ghi chú điều này.
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
vừa biết phải gõ gì. Kana ngẫu nhiên lấy từ `kana-data.json` (104 chữ mỗi bảng, gồm biến âm và âm ghép).

Câu mẫu đóng gói sẵn ở frontend: nội dung cố định, không cần gọi máy chủ.
Thêm câu mới chỉ cần sửa file này — test `phrases.test.ts` tự kiểm tra mọi câu **gõ trọn được bằng cả romaji lẫn kana JIS**
và đúng loại chữ của nhóm.

### 3.4 Kiểm thử

| Tầng | Test |
|---|---|
| Web — `engine.test.ts` | Mọi biến thể romaji, luật ん/っ, âm ghép, katakana mở rộng, gợi ý thích ứng, phím sai không đổi trạng thái, bố cục JIS và phím thay thế trên bàn phím US |
| Web — `phrases.test.ts` | Phân tích furigana; **từng câu trong kho** gõ trọn bằng romaji và kana; nguồn câu không lặp; 600 chuỗi kana ngẫu nhiên đều gõ được |
| Web — `ime.test.ts` | Chuẩn hoá chữ IME (NFKC, bỏ dấu câu), so khớp chữ đã chốt, quy đổi số phím; cụm kanji chỉ tính khi đổi đúng trọn cụm |
| Web — `score.test.ts` | KPM, độ chính xác, điểm, sinh tử, thang đai |
| Web — `history.test.ts` | Kỷ lục theo tổ hợp, chỉ đổi khi điểm cao hơn, giới hạn số lượt gần đây, dữ liệu hỏng thì bắt đầu lại |

---

## 4. Hướng phát triển

- **Đồng bộ lên tài khoản**: bảng `typing_sessions` + `POST /typing/sessions`, server **tự tính lại điểm** từ số phím
  (không tin điểm client gửi), chặn tốc độ phi thực tế (> 1 500 phím/phút), cộng XP vào `daily_activity` để tính streak,
  mục tiêu ngày và bảng xếp hạng tuần.
- **Luyện điểm yếu theo lịch sử**: ghi lại kana hay sai qua nhiều lượt, sinh bài luyện riêng từ đó (hiện chỉ hiện ở màn kết quả).
- **Nội dung từ vựng JLPT** lấy thẳng từ `/vocabulary` (đã có nghĩa tiếng Việt và câu ví dụ).
- Huy hiệu luyện gõ (đạt 黒帯, 100 lượt…) và bảng xếp hạng riêng theo chế độ.
- Bảng romaji tuỳ chỉnh (AZIK) — chỉ cần thêm một bảng ứng viên.
- Âm thanh phím, biểu đồ tiến bộ theo ngày.
