import Link from "next/link";
import type { Metadata } from "next";
import { Brand } from "@/components/app/Brand";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { HeroDemo } from "@/components/kana/HeroDemo";
import { Button } from "@/components/ui";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const FAQ = [
  {
    q: "Học Hiragana mất bao lâu?",
    a: "Với 15–20 phút mỗi ngày, phần lớn người học viết thạo 46 chữ Hiragana cơ bản trong 2–3 tuần. Điều quyết định không phải học bao lâu mỗi buổi, mà là có quay lại đúng ngày hệ thống nhắc hay không.",
  },
  {
    q: "Vì sao phải viết đúng thứ tự nét?",
    a: "Thứ tự nét quyết định hình dáng chữ khi viết nhanh, và là cơ sở để sau này tra Kanji theo bộ thủ. Viết sai thứ tự thì chữ vẫn đọc được lúc viết chậm, nhưng sẽ méo khi viết nhanh và rất khó sửa về sau.",
  },
  {
    q: "Nên học Hiragana hay Katakana trước?",
    a: "Hiragana trước. Nó xuất hiện trong hầu hết câu tiếng Nhật và là nền tảng ngữ pháp. Katakana chủ yếu dùng cho từ mượn, học sau sẽ nhẹ hơn vì nhiều nét đã quen tay.",
  },
  {
    q: "Có cần cài ứng dụng không?",
    a: "Không. Kana Dōjō chạy thẳng trên trình duyệt của điện thoại lẫn máy tính, hỗ trợ cả ngón tay, bút cảm ứng và chuột. Tiến độ đồng bộ theo tài khoản nên đổi thiết bị vẫn học tiếp được.",
  },
];

export default function Landing() {
  return (
    <>
      <header className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-4">
        <Brand />
        <nav className="ml-auto flex items-center gap-2">
          <Link href="/bang-chu-cai/hiragana" className="hidden px-3 text-sm text-sumi-2 hover:text-sumi sm:block">
            Bảng chữ cái
          </Link>
          <ThemeToggle />
          <Link href="/dang-nhap"><Button size="sm">Đăng nhập</Button></Link>
          <Link href="/dang-ky"><Button size="sm" variant="solid">Bắt đầu</Button></Link>
        </nav>
      </header>

      {/* ------------------------------------------------------------- hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.05fr_1fr] lg:py-16">
        <div className="flex flex-col gap-5">
          <span className="w-fit rounded-full border border-genko/30 bg-genko-tint px-3 py-1 text-[12px] font-medium text-genko">
            208 ký tự · thứ tự nét chuẩn KanjiVG
          </span>

          <h1 className="text-balance font-mincho text-4xl font-semibold leading-[1.15] sm:text-5xl">
            Học viết tiếng Nhật <span className="text-shu">đúng nét</span> ngay từ ngày đầu
          </h1>

          <p className="max-w-[52ch] text-[15px] leading-relaxed text-sumi-2">
            Hầu hết ứng dụng chỉ dạy bạn <em>nhận mặt chữ</em>. Kana Dōjō bắt bạn viết ra —
            rồi chấm từng nét một: sai hình, sai chiều, sai thứ tự đều được chỉ rõ.
            Điểm đó cũng chính là thứ quyết định khi nào bạn cần ôn lại.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link href="/dang-ky"><Button variant="solid" size="lg">Học miễn phí</Button></Link>
            <Link href="/bang-chu-cai/hiragana"><Button size="lg">Xem bảng Hiragana</Button></Link>
          </div>

          <p className="text-[12.5px] text-sumi-3">
            Không quảng cáo · Không cần thẻ ngân hàng · Toàn bộ Kana miễn phí vĩnh viễn
          </p>
        </div>

        <HeroDemo />
      </section>

      {/* ------------------------------------------------------ khác biệt */}
      <section className="mx-auto max-w-6xl px-5 py-12">
        <h2 className="font-mincho text-2xl font-semibold">Ba thứ không app nào khác làm cùng lúc</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {[
            {
              n: "01",
              t: "Máy chấm, không phải bạn tự chấm",
              d: "Nét bạn vẽ được lấy lại mẫu theo độ dài cung rồi so với đường tâm nét chuẩn. Sai lệch hình dáng, chiều viết và độ dài đều bị trừ điểm — không có chỗ cho cảm tính.",
            },
            {
              n: "02",
              t: "Lịch ôn tính từ chính điểm viết",
              d: "Anki và WaniKani hỏi bạn “có nhớ không” rồi tin câu trả lời. Ở đây thuật toán FSRS nhận điểm đo được từ nét viết làm đầu vào, nên lịch ôn bám sát trí nhớ thật.",
            },
            {
              n: "03",
              t: "Chạy trên web, viết bằng ngón tay",
              d: "Không cài đặt, không kho ứng dụng. Mở trình duyệt trên điện thoại là viết được ngay, tiến độ đồng bộ sang máy tính.",
            },
          ].map((f) => (
            <div key={f.n} className="flex flex-col gap-2 border-t-2 border-shu pt-4">
              <span className="font-mincho text-[13px] font-semibold text-shu tnum">{f.n}</span>
              <h3 className="font-mincho text-lg">{f.t}</h3>
              <p className="text-[14px] leading-relaxed text-sumi-2">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- so sánh */}
      <section className="mx-auto max-w-6xl px-5 py-12">
        <h2 className="font-mincho text-2xl font-semibold">So với những cách học phổ biến</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-rule text-left">
                <th className="py-2.5 pr-4 font-medium text-sumi-3">&nbsp;</th>
                <th className="py-2.5 pr-4 font-mincho font-semibold text-shu">Kana Dōjō</th>
                <th className="py-2.5 pr-4 font-medium text-sumi-2">Duolingo</th>
                <th className="py-2.5 pr-4 font-medium text-sumi-2">Anki</th>
                <th className="py-2.5 font-medium text-sumi-2">Sách tập viết</th>
              </tr>
            </thead>
            <tbody className="text-sumi-2">
              {[
                ["Tập viết tay", "Có, chấm từng nét", "Không", "Không", "Có, không chấm"],
                ["Kiểm tra thứ tự nét", "Có", "Không", "Không", "Tự kiểm tra"],
                ["Lịch ôn theo trí nhớ", "FSRS, lấy điểm viết", "Cố định", "FSRS, tự chấm", "Không"],
                ["Giao diện tiếng Việt", "Có", "Có", "Cần cài thêm", "Tùy sách"],
                ["Cần cài đặt", "Không", "Có", "Có", "—"],
              ].map((row) => (
                <tr key={row[0]} className="border-b border-rule">
                  <th className="py-2.5 pr-4 text-left font-medium text-sumi">{row[0]}</th>
                  {row.slice(1).map((cell, i) => (
                    <td key={i} className={`py-2.5 pr-4 ${i === 0 ? "font-medium text-genko" : ""}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ----------------------------------------------------------- FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-12">
        <h2 className="font-mincho text-2xl font-semibold">Câu hỏi thường gặp</h2>
        <div className="mt-5 flex flex-col">
          {FAQ.map((f) => (
            <details key={f.q} className="group border-b border-rule py-4">
              <summary className="cursor-pointer list-none font-mincho text-[17px] marker:hidden">
                {f.q}
              </summary>
              <p className="mt-2.5 text-[14px] leading-relaxed text-sumi-2">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="flex flex-col items-center gap-4 rounded-xl border border-rule bg-surface px-6 py-12 text-center">
          <h2 className="text-balance font-mincho text-3xl font-semibold">Viết chữ đầu tiên trong 30 giây</h2>
          <p className="max-w-[46ch] text-[15px] text-sumi-2">
            Không cần thẻ ngân hàng, không quảng cáo. Toàn bộ 208 ký tự Hiragana và Katakana miễn phí vĩnh viễn.
          </p>
          <Link href="/dang-ky"><Button variant="solid" size="lg">Tạo tài khoản miễn phí</Button></Link>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl border-t border-rule px-5 py-8 text-[12.5px] leading-relaxed text-sumi-3">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/bang-chu-cai/hiragana" className="hover:text-sumi">Bảng chữ cái Hiragana</Link>
          <Link href="/bang-chu-cai/katakana" className="hover:text-sumi">Bảng chữ cái Katakana</Link>
          <Link href="/dang-nhap" className="hover:text-sumi">Đăng nhập</Link>
        </div>
        <p className="mt-4">
          Dữ liệu thứ tự nét lấy từ{" "}
          <a href="http://kanjivg.tagaini.net" target="_blank" rel="noopener noreferrer" className="text-genko hover:underline">KanjiVG</a>{" "}
          © Ulrich Apel, giấy phép{" "}
          <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer" className="text-genko hover:underline">CC BY-SA 3.0</a>.
          Bản dẫn xuất giữ nguyên giấy phép đó.
        </p>
      </footer>

      {/* Dữ liệu có cấu trúc để Google hiện FAQ ngay trên trang kết quả */}
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
    </>
  );
}
