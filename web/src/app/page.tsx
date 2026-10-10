import Link from "next/link";
import type { Metadata } from "next";
import { Brand } from "@/components/app/Brand";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { HeroDemo } from "@/components/kana/HeroDemo";
import { Badge, Button } from "@/components/ui";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const FAQ = [
  {
    q: "Học bảng chữ cái Hiragana mất bao lâu?",
    a: "Chỉ với 15–20 phút luyện tập mỗi ngày, phần lớn người học viết thạo toàn bộ 46 chữ Hiragana cơ bản trong vòng 2–3 tuần. Điều quyết định hiệu quả không phải là học dồn bao lâu mỗi buổi, mà là quay lại luyện tập đúng thời điểm được thuật toán FSRS nhắc nhở.",
  },
  {
    q: "Vì sao nhất định phải viết đúng thứ tự nét?",
    a: "Thứ tự nét quyết định trực tiếp đến hình dáng cân đối của chữ khi viết nhanh, đồng thời là nền tảng cốt lõi để sau này nhận diện và tra cứu chữ Hán (Kanji) theo bộ thủ. Viết sai thứ tự khiến chữ bị méo mó khi viết tốc ký và tạo thói quen sai rất khó sửa sau này.",
  },
  {
    q: "Nên học Hiragana hay Katakana trước?",
    a: "Bạn nên học Hiragana trước vì đây là bảng chữ cái xuất hiện trong hầu hết các câu tiếng Nhật và đóng vai trò ngữ pháp chính. Katakana chủ yếu dùng cho các từ mượn nước ngoài, học sau sẽ rất nhanh vì cơ tay đã quen với các nét chữ cơ bản.",
  },
  {
    q: "Ứng dụng có hỗ trợ bút cảm ứng (Apple Pencil, S-Pen) không?",
    a: "Có, hoàn toàn mượt mà. Kana Dōjō được tối ưu hóa đặc biệt cho màn hình cảm ứng, nhận diện nét vẽ bằng bút stylus, ngón tay trên điện thoại/máy tính bảng cũng như chuột trên máy tính để bàn. Tiến độ được lưu ngay trong trình duyệt của bạn nên không cần đăng ký tài khoản.",
  },
];

const COMPARISON = [
  {
    feature: "Luyện viết tay tương tác",
    kanadojo: "Có, chấm điểm từng nét theo thời gian thực",
    duolingo: "Không (chỉ ghép chữ / trắc nghiệm)",
    anki: "Không (chỉ lật thẻ flashcard)",
    book: "Có (tự nhìn mẫu chép tay)",
  },
  {
    feature: "Kiểm tra chiều & thứ tự nét",
    kanadojo: "Chỉ rõ lỗi ngược chiều / sai thứ tự nét",
    duolingo: "Không hỗ trợ kiểm tra nét",
    anki: "Không hỗ trợ",
    book: "Không có ai chấm lỗi",
  },
  {
    feature: "Lịch ôn lặp lại ngắt quãng",
    kanadojo: "Thuật toán FSRS-6 đo lường độ nhớ sinh học",
    duolingo: "Lặp lại ngẫu nhiên cố định",
    anki: "FSRS (người dùng tự bấm cảm tính)",
    book: "Tự ghi nhớ thủ công",
  },
  {
    feature: "Giao diện tiếng Việt chuẩn mực",
    kanadojo: "100% tiếng Việt chuẩn Unicode & ngữ pháp",
    duolingo: "Hỗ trợ một phần",
    anki: "Phải tự cài đặt plugin phức tạp",
    book: "Tùy thuộc từng giáo trình",
  },
  {
    feature: "Chi phí & cài đặt",
    kanadojo: "Miễn phí 100%, không cần tài khoản, học ngay trên trình duyệt",
    duolingo: "Có quảng cáo / gói Super trả phí",
    anki: "Trả phí cao trên iOS",
    book: "Tốn chi phí mua nhiều tập vở",
  },
];

const METRIC_PILLS = [
  { label: "Mỗi người một dōjō riêng: tự soạn tài liệu & bộ thẻ", icon: "🏯" },
  { label: "Miễn phí, không cần tài khoản", icon: "✨" },
  { label: "Chấm nét 24 điểm Arc-length", icon: "🎯" },
  { label: "Chuẩn 208 ký tự Hiragana & Katakana", icon: "📜" },
  { label: "Thuật toán FSRS-6 thế hệ mới", icon: "🧠" },
];

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-paper text-sumi selection:bg-shu-tint selection:text-shu-2">
      {/* ------------------------------------------------------------- HỌA TIẾT THƯ PHÁP VÀ ÁNH SÁNG NỀN */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Lưới ô vuông mờ Genko Yōshi */}
        <div className="bg-genko-grid absolute inset-0 opacity-[0.45] dark:opacity-[0.25]" />

        {/* Quầng sáng quang phổ ấm */}
        <div className="absolute -top-48 left-1/2 -translate-x-1/2 h-[600px] w-[1100px] rounded-full bg-gradient-to-b from-shu/10 via-gold/5 to-transparent blur-3xl" />
        <div className="absolute top-[40%] -left-48 h-[500px] w-[500px] rounded-full bg-genko/8 blur-3xl" />
        <div className="absolute top-[70%] -right-48 h-[500px] w-[500px] rounded-full bg-shu/8 blur-3xl" />

        {/* Chữ Kanji nghệ thuật bay bổng làm hình mờ (Calligraphy Watermark) */}
        <div className="float-slow absolute top-28 right-8 select-none font-mincho text-[160px] font-bold text-sumi/[0.035] dark:text-white/[0.03] leading-none">
          道
        </div>
        <div className="float-slow absolute top-[48%] left-6 select-none font-mincho text-[180px] font-bold text-sumi/[0.03] dark:text-white/[0.025] leading-none" style={{ animationDelay: "-3s" }}>
          書
        </div>
        <div className="float-slow absolute top-[78%] right-12 select-none font-mincho text-[150px] font-bold text-sumi/[0.03] dark:text-white/[0.025] leading-none" style={{ animationDelay: "-5s" }}>
          心
        </div>
      </div>

      {/* ------------------------------------------------------------- HEADER */}
      <header className="sticky top-0 z-50 border-b border-rule/70 bg-paper/85 backdrop-blur-xl transition-colors">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-5 py-3">
          <Brand />

          <nav className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-1.5 mr-2">
              <Link
                href="/bang-chu-cai/hiragana"
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-sumi-2 hover:bg-rule/40 hover:text-sumi transition-colors"
              >
                Hiragana
              </Link>
              <Link
                href="/bang-chu-cai/katakana"
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-sumi-2 hover:bg-rule/40 hover:text-sumi transition-colors"
              >
                Katakana
              </Link>
              <Link
                href="/luyen-viet"
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-sumi-2 hover:bg-rule/40 hover:text-sumi transition-colors"
              >
                Luyện viết
              </Link>
              <Link
                href="/tu-vung"
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-sumi-2 hover:bg-rule/40 hover:text-sumi transition-colors"
              >
                Từ vựng
              </Link>
              <Link
                href="/quiz"
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-sumi-2 hover:bg-rule/40 hover:text-sumi transition-colors"
              >
                Quiz
              </Link>
            </div>

            <ThemeToggle />

            <Link href="/bang-dieu-khien" className="hidden sm:inline-flex">
              <Button size="sm" variant="outline">
                Dōjō của tôi
              </Button>
            </Link>
            <Link href="/luyen-viet">
              <Button size="sm" variant="solid" className="px-3 sm:px-4 text-xs sm:text-sm">
                Vào học
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* ------------------------------------------------------------- HERO SECTION */}
        <section className="mx-auto grid max-w-6xl items-center gap-8 lg:gap-12 px-4 sm:px-5 pt-8 pb-12 sm:pt-16 sm:pb-24 lg:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col gap-5 sm:gap-6 text-left min-w-0">
            {/* Imperial pill badge */}
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-shu/30 bg-shu-tint/90 px-3 sm:px-4 py-1.5 shadow-xs backdrop-blur-md">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-shu opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-shu shadow-xs shadow-shu" />
              </span>
              <span className="font-sans text-[11px] sm:text-xs font-bold tracking-wide text-shu-2 leading-none">
                Chuẩn 208 ký tự · KanjiVG Vector · FSRS-6
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-mincho text-[30px] sm:text-4xl lg:text-[56px] font-bold leading-[1.2] tracking-tight text-sumi">
              Học viết tiếng Nhật{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-shu via-shu to-shu-2 bg-clip-text text-transparent">
                  đúng từng nét
                </span>
                {/* Vệt gạch chân mực thư pháp */}
                <svg
                  className="absolute -bottom-1.5 left-0 w-full text-shu/30 overflow-visible"
                  viewBox="0 0 100 8"
                  preserveAspectRatio="none"
                  height="7"
                >
                  <path
                    d="M0,5 Q30,1 60,4 T100,2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>{" "}
              ngay từ ngày đầu tiên
            </h1>

            {/* Description */}
            <p className="max-w-[54ch] text-sm sm:text-base leading-relaxed text-sumi-2 sm:text-[17px]">
              Hầu hết ứng dụng chỉ dạy bạn <em>nhận mặt chữ thụ động qua trắc nghiệm</em>. Kana Dōjō đưa bạn vào không gian
              rèn luyện thực thụ: cầm bút vẽ từng nét trên giấy ô vuông Nhật Bản — máy chấm điểm tức thì, phát hiện vẽ ngược chiều
              hay sai thứ tự để khắc phục ngay.
            </p>
            <p className="max-w-[54ch] text-sm sm:text-base leading-relaxed text-sumi-2 sm:text-[17px]">
              Và mỗi người mở trang này có <b>một dōjō của riêng mình</b>: bạn chọn công cụ nào hiện ra, tự soạn ghi chú, bộ thẻ và
              câu luyện gõ, rồi quyết định học theo cách của bạn — mọi thứ nằm ngay trong trình duyệt, không cần tài khoản.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <Link href="/bang-dieu-khien" className="w-full sm:w-auto">
                <Button variant="solid" size="lg" className="w-full sm:w-auto justify-center group text-[15px] px-6 sm:px-7 shadow-lg shadow-shu/25">
                  <span>Dựng dōjō của tôi</span>
                  <svg
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Button>
              </Link>
              <Link href="/bang-chu-cai/hiragana" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto justify-center font-semibold text-[15px] px-6">
                  Xem bảng Hiragana
                </Button>
              </Link>
            </div>

            {/* Floating Metric Pills */}
            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
              {METRIC_PILLS.map((pill, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-xl border border-rule/80 bg-surface/70 px-3 py-2 sm:py-1.5 text-xs font-semibold text-sumi-2 backdrop-blur-xs shadow-2xs"
                >
                  <span className="shrink-0">{pill.icon}</span>
                  <span className="leading-snug">{pill.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Studio Demo */}
          <div className="flex justify-center lg:justify-end">
            <HeroDemo />
          </div>
        </section>

        {/* ------------------------------------------------------------- DẢI CHÂM NGÔN THƯ PHÁP (ZEN BANNER) */}
        <section className="border-y border-rule/70 bg-gradient-to-r from-paper-sunk/60 via-surface/80 to-paper-sunk/60 py-6 px-5 backdrop-blur-md">
          <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-3 text-center sm:flex-row sm:gap-6">
            <span className="hanko-seal px-3 py-1 text-base">
              道場
            </span>
            <div className="flex flex-col sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-3">
                <span className="font-mincho text-xl font-bold tracking-widest text-sumi sm:text-2xl">
                  「継続は力なり」
                </span>
                <span className="text-xs font-semibold text-sumi-3 uppercase tracking-wider">
                  — Tục ngữ Nhật Bản
                </span>
              </div>
              <p className="mt-0.5 text-xs font-medium text-sumi-3">
                <em>Keizoku wa chikara nari</em> · Kiên trì chính là sức mạnh. 15 phút viết tay mỗi ngày mở lối cho toàn bộ ngôn ngữ tiếng Nhật.
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- 3 BENTO CARDS */}
        <section className="mx-auto max-w-6xl px-5 py-18">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge variant="genko" className="mb-3">
              CÔNG NGHỆ THIẾT KẾ ĐỘT PHÁ
            </Badge>
            <h2 className="font-mincho text-3xl font-bold tracking-tight text-sumi sm:text-4xl">
              Ba giá trị cốt lõi tạo nên sự khác biệt
            </h2>
            <p className="mt-3 text-sm text-sumi-2 sm:text-base leading-relaxed">
              Phương pháp học được thiết kế khoa học, kết hợp cảm giác viết giấy truyền thống với thuật toán ghi nhớ hiện đại.
            </p>
          </div>

          <div className="grid gap-7 md:grid-cols-3">
            {/* Card 1: 筆 */}
            <div className="glass-luxury group relative flex flex-col justify-between overflow-hidden rounded-[26px] p-8 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-shu/40">
              {/* Thư pháp chìm */}
              <span className="pointer-events-none absolute -right-3 -top-5 select-none font-mincho text-[110px] font-bold text-sumi/[0.04] dark:text-white/[0.03] transition-transform duration-300 group-hover:scale-110">
                筆
              </span>

              <div className="flex flex-col gap-4 relative z-10">
                <div className="grid h-13 w-13 place-items-center rounded-2xl bg-gradient-to-br from-shu to-shu-2 text-white shadow-md shadow-shu/30 ring-1 ring-white/25">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <h3 className="font-mincho text-xl font-bold text-sumi">
                  Máy chấm nét cọ tự động, không để bạn tự đoán
                </h3>
                <p className="text-sm leading-relaxed text-sumi-2">
                  Thuật toán Arc-length Resampling lấy mẫu 24 điểm cung chuẩn xác. Hệ thống phát hiện ngay lập tức nét vẽ
                  ngược chiều, nét quá ngắn hoặc lệch hướng để bạn kịp thời sửa đổi.
                </p>
              </div>

              <div className="mt-7 flex items-center gap-2 border-t border-rule/70 pt-4 text-xs font-bold text-shu">
                <span>Chấm điểm từ 0–100 khách quan</span>
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
              </div>
            </div>

            {/* Card 2: 記 */}
            <div className="glass-luxury group relative flex flex-col justify-between overflow-hidden rounded-[26px] p-8 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-genko/40">
              {/* Thư pháp chìm */}
              <span className="pointer-events-none absolute -right-3 -top-5 select-none font-mincho text-[110px] font-bold text-sumi/[0.04] dark:text-white/[0.03] transition-transform duration-300 group-hover:scale-110">
                記
              </span>

              <div className="flex flex-col gap-4 relative z-10">
                <div className="grid h-13 w-13 place-items-center rounded-2xl bg-gradient-to-br from-genko to-genko-2 text-white shadow-md shadow-genko/30 ring-1 ring-white/25">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-mincho text-xl font-bold text-sumi">
                  Lịch ôn FSRS-6 tính từ chính độ chính xác nét vẽ
                </h3>
                <p className="text-sm leading-relaxed text-sumi-2">
                  Không giống Anki bắt bạn tự bấm &ldquo;Dễ&rdquo; hay &ldquo;Khó&rdquo;. Điểm nét viết thực tế được nạp thẳng vào bộ lập lịch
                  FSRS-6 thế hệ mới, tối ưu hóa khoảng cách ngày ôn tập theo đúng trí nhớ sinh học.
                </p>
              </div>

              <div className="mt-7 flex items-center gap-2 border-t border-rule/70 pt-4 text-xs font-bold text-genko">
                <span>Mục tiêu ghi nhớ 90% lâu dài</span>
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
              </div>
            </div>

            {/* Card 3: 機 */}
            <div className="glass-luxury group relative flex flex-col justify-between overflow-hidden rounded-[26px] p-8 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-gold/40">
              {/* Thư pháp chìm */}
              <span className="pointer-events-none absolute -right-3 -top-5 select-none font-mincho text-[110px] font-bold text-sumi/[0.04] dark:text-white/[0.03] transition-transform duration-300 group-hover:scale-110">
                機
              </span>

              <div className="flex flex-col gap-4 relative z-10">
                <div className="grid h-13 w-13 place-items-center rounded-2xl bg-gradient-to-br from-gold to-gold-2 text-white shadow-md shadow-gold/30 ring-1 ring-white/25">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-mincho text-xl font-bold text-sumi">
                  Học tức thì trên trình duyệt, không cần cài ứng dụng
                </h3>
                <p className="text-sm leading-relaxed text-sumi-2">
                  Chỉ cần mở trình duyệt web trên điện thoại, máy tính bảng hoặc laptop. Hỗ trợ mượt mà cả ngón tay cảm ứng,
                  bút stylus và chuột máy tính với dữ liệu nét vector sắc nét ở mọi kích cỡ màn hình.
                </p>
              </div>

              <div className="mt-7 flex items-center gap-2 border-t border-rule/70 pt-4 text-xs font-bold text-gold">
                <span>Không cần tài khoản — tiến độ lưu ngay trên máy bạn</span>
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- SO SÁNH PHƯƠNG PHÁP (SPOTLIGHT TABLE) */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge variant="shu" className="mb-3">
              TẠI SAO CHỌN KANA DŌJŌ
            </Badge>
            <h2 className="font-mincho text-3xl font-bold tracking-tight text-sumi sm:text-4xl">
              So sánh với các phương pháp học hiện nay
            </h2>
            <p className="mt-3 text-sm text-sumi-2 sm:text-base leading-relaxed">
              Hiểu rõ vì sao người học chuyển sang luyện viết cùng Kana Dōjō thay vì các ứng dụng trắc nghiệm thụ động.
            </p>
          </div>

          {/* Swipe indicator on mobile */}
          <div className="flex items-center justify-end gap-1.5 pb-2 text-[11.5px] font-medium text-sumi-3 sm:hidden">
            <svg className="h-3.5 w-3.5 animate-pulse text-shu" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <span>Vuốt ngang để so sánh</span>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-rule/80 bg-surface/90 shadow-lg shadow-sumi/5 backdrop-blur-xl">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-rule/80 bg-paper-sunk/60 text-xs uppercase tracking-wider text-sumi-3">
                  <th className="py-5 px-6 font-bold">Tính năng</th>
                  {/* Cột nổi bật Kana Dōjō */}
                  <th className="relative py-5 px-6 font-bold text-shu bg-shu-tint/60 border-x-2 border-t-2 border-shu/40">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-extrabold">
                        <span className="h-2.5 w-2.5 rounded-full bg-shu shadow-xs shadow-shu" />
                        Kana Dōjō
                      </span>
                      <span className="rounded-full bg-shu px-2 py-0.5 text-[9.5px] font-bold uppercase text-white shadow-2xs">
                        Khuyên dùng
                      </span>
                    </div>
                  </th>
                  <th className="py-5 px-6 font-semibold text-sumi-2">Duolingo</th>
                  <th className="py-5 px-6 font-semibold text-sumi-2">Anki</th>
                  <th className="py-5 px-6 font-semibold text-sumi-2">Sách tập viết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule/60 text-sumi-2">
                {COMPARISON.map((row, idx) => (
                  <tr key={idx} className="transition-colors hover:bg-paper-sunk/40">
                    <td className="py-4.5 px-6 font-semibold text-sumi">{row.feature}</td>
                    {/* Cột nổi bật Kana Dōjō */}
                    <td className="py-4.5 px-6 font-bold text-genko bg-shu-tint/30 border-x-2 border-shu/40">
                      <div className="flex items-center gap-2">
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-genko-tint text-genko border border-genko/30 shrink-0">
                          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="text-[13.5px]">{row.kanadojo}</span>
                      </div>
                    </td>
                    <td className="py-4.5 px-6 text-sumi-3 text-[13px]">{row.duolingo}</td>
                    <td className="py-4.5 px-6 text-sumi-3 text-[13px]">{row.anki}</td>
                    <td className="py-4.5 px-6 text-sumi-3 text-[13px]">{row.book}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ------------------------------------------------------------- FAQ ACCORDION */}
        <section className="mx-auto max-w-3xl px-5 py-16">
          <div className="text-center mb-12">
            <Badge variant="neutral" className="mb-3">
              CÂU HỎI PHỔ BIẾN
            </Badge>
            <h2 className="font-mincho text-3xl font-bold tracking-tight text-sumi sm:text-4xl">
              Giải đáp thắc mắc thường gặp
            </h2>
            <p className="mt-2 text-sm text-sumi-2">
              Những điều người mới bắt đầu học tiếng Nhật hay quan tâm nhất.
            </p>
          </div>

          <div className="flex flex-col gap-3.5">
            {FAQ.map((f, idx) => (
              <details
                key={idx}
                className="group glass-luxury rounded-2xl p-5.5 shadow-xs transition-all duration-200 hover:border-rule-firm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between font-mincho text-lg font-bold text-sumi marker:hidden">
                  <span className="group-hover:text-shu transition-colors">{f.q}</span>
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-paper-sunk text-sumi-2 transition-transform duration-200 group-open:rotate-180 group-open:bg-shu group-open:text-white">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-sumi-2 pt-3 border-t border-rule/50">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------- FINAL CALL TO ACTION */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-shu via-shu to-shu-2 px-8 py-16 text-center text-white shadow-2xl shadow-shu/35 sm:px-14 sm:py-22">
            {/* Hoa văn Seigaiha sóng nước chìm */}
            <div className="bg-seigaiha pointer-events-none absolute inset-0 opacity-15" />

            {/* Background decorative Kanji */}
            <div className="pointer-events-none absolute right-4 -bottom-10 select-none font-mincho text-[220px] font-bold text-white/[0.08] leading-none">
              書
            </div>
            <div className="pointer-events-none absolute left-6 -top-10 select-none font-mincho text-[180px] font-bold text-white/[0.06] leading-none">
              道
            </div>

            <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-7">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <span>🌸</span>
                <span>Học trực tuyến hoàn toàn miễn phí</span>
              </span>

              <h2 className="font-mincho text-3xl font-bold tracking-tight sm:text-5xl sm:leading-tight">
                Bắt đầu viết chữ tiếng Nhật đầu tiên ngay hôm nay
              </h2>

              <p className="max-w-[48ch] text-base leading-relaxed text-white/90 sm:text-lg">
                Không cần tài khoản, không thẻ tín dụng, không quảng cáo làm phiền. Mở trình duyệt và cầm bút luyện nét ngay bây giờ.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-2 w-full max-w-md sm:max-w-none">
                <Link href="/luyen-viet" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto justify-center bg-white text-shu hover:bg-white/95 hover:scale-[1.02] shadow-xl font-bold text-base px-8 sm:px-9 py-3.5 sm:py-4 cursor-pointer"
                  >
                    Vào luyện viết ngay
                  </Button>
                </Link>
                <Link href="/bang-chu-cai/hiragana" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto justify-center border-white/40 bg-white/10 text-white hover:bg-white/20 backdrop-blur-md text-base px-6 sm:px-7 py-3.5 sm:py-4"
                  >
                    Khám phá bảng chữ cái
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ------------------------------------------------------------- FOOTER */}
      <footer className="border-t border-rule/70 bg-paper-sunk/50 px-5 py-12 text-xs leading-relaxed text-sumi-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-6 gap-y-2 font-medium">
            <Link href="/bang-chu-cai/hiragana" className="hover:text-sumi transition-colors">
              Bảng chữ cái Hiragana
            </Link>
            <Link href="/bang-chu-cai/katakana" className="hover:text-sumi transition-colors">
              Bảng chữ cái Katakana
            </Link>
            <Link href="/luyen-viet" className="hover:text-sumi transition-colors">
              Studio luyện viết
            </Link>
            <Link href="/tu-vung" className="hover:text-sumi transition-colors">
              Từ vựng JLPT
            </Link>
            <Link href="/quiz" className="hover:text-sumi transition-colors">
              Quiz
            </Link>
          </div>
          <div className="flex items-center gap-2 text-sumi-3">
            <span className="hanko-seal px-1.5 py-0.5 text-[10px]">済</span>
            <span>© {new Date().getFullYear()} Kana Dōjō. Nền tảng học viết tiếng Nhật thông minh.</span>
          </div>
        </div>

        <div className="mx-auto max-w-6xl mt-6 pt-6 border-t border-rule/40 text-[11.5px] text-sumi-3/80">
          Dữ liệu đường nét vector trích xuất từ{" "}
          <a
            href="http://kanjivg.tagaini.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-genko font-semibold hover:underline"
          >
            KanjiVG
          </a>{" "}
          © Ulrich Apel, phát hành theo giấy phép{" "}
          <a
            href="https://creativecommons.org/licenses/by-sa/3.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-genko font-semibold hover:underline"
          >
            CC BY-SA 3.0
          </a>
          . Toàn bộ tác phẩm dẫn xuất tuân thủ cùng điều khoản cấp phép.
        </div>
      </footer>

      {/* Dữ liệu có cấu trúc SEO FAQ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
    </div>
  );
}
