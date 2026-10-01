import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Brand } from "@/components/app/Brand";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { Badge, Button } from "@/components/ui";
import { GROUP_LABEL, charsOf, rowsOf, type Script } from "@/lib/kana";

/* Hai trang này được dựng sẵn ở lúc build và render hoàn toàn phía máy chủ.
   Chúng là cửa ngõ SEO: "bảng chữ cái hiragana" là truy vấn có lượng tìm kiếm
   lớn ở Việt Nam, và nội dung trả về phải là văn bản thật để Google đọc được,
   không phải một khung ứng dụng rỗng chờ JavaScript. */

const META: Record<string, { script: Script; name: string; jp: string; other: string; otherSlug: string; intro: string }> = {
  hiragana: {
    script: "h", name: "Hiragana", jp: "ひらがな", other: "Katakana", otherSlug: "katakana",
    intro:
      "Hiragana là bảng chữ cái đầu tiên người học tiếng Nhật cần nắm. Nó xuất hiện trong hầu hết mọi câu tiếng Nhật, dùng để ghi trợ từ, đuôi động từ và các từ thuần Nhật. Bảng dưới đây gồm đủ 104 âm: 46 âm cơ bản, 25 âm biến âm và 33 âm ghép, kèm số nét của từng chữ.",
  },
  katakana: {
    script: "k", name: "Katakana", jp: "カタカナ", other: "Hiragana", otherSlug: "hiragana",
    intro:
      "Katakana dùng để ghi từ mượn tiếng nước ngoài, tên riêng nước ngoài, từ tượng thanh và các từ muốn nhấn mạnh. Cách đọc hoàn toàn trùng với Hiragana, chỉ khác hình chữ — nét thẳng và gãy góc hơn. Bảng dưới đây gồm đủ 104 âm kèm số nét của từng chữ.",
  },
};

export function generateStaticParams() {
  return [{ script: "hiragana" }, { script: "katakana" }];
}

export async function generateMetadata({ params }: { params: Promise<{ script: string }> }): Promise<Metadata> {
  const { script } = await params;
  const m = META[script];
  if (!m) return {};
  return {
    title: `Bảng chữ cái ${m.name} đầy đủ — cách đọc và thứ tự nét`,
    description: `Bảng ${m.name} (${m.jp}) đầy đủ 104 âm: romaji, cách đọc gần đúng tiếng Việt và số nét. Bấm vào chữ bất kỳ để tập viết và được chấm điểm từng nét.`,
    alternates: { canonical: `/bang-chu-cai/${script}` },
  };
}

export default async function KanaTablePage({ params }: { params: Promise<{ script: string }> }) {
  const { script } = await params;
  const m = META[script];
  if (!m) notFound();

  const rows = rowsOf(charsOf(m.script, "all"));
  let lastGroup: string | null = null;

  return (
    <div className="relative min-h-screen bg-paper text-sumi selection:bg-shu-tint selection:text-shu-2">
      {/* Nền hoa văn lưới Genko mờ */}
      <div className="bg-genko-grid pointer-events-none fixed inset-0 z-0 opacity-[0.35]" />

      <header className="sticky top-0 z-50 border-b border-rule/70 bg-paper/85 backdrop-blur-xl transition-colors">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3.5">
          <Brand />
          <nav className="flex items-center gap-2.5">
            <ThemeToggle />
            <Link href="/luyen-viet">
              <Button size="sm" variant="solid">
                Tập viết miễn phí
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-5 pt-8 pb-20">
        <div className="max-w-3xl">
          <Badge variant="shu" className="mb-3.5">
            BẢNG CHỮ CÁI TIẾNG NHẬT CHUẨN
          </Badge>
          <h1 className="text-balance font-mincho text-3xl font-bold tracking-tight sm:text-4xl lg:text-[42px]">
            Bảng chữ cái {m.name}{" "}
            <span className="text-shu">({m.jp})</span>
          </h1>
          <p className="mt-3.5 leading-relaxed text-sumi-2 text-base">{m.intro}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href={`/bang-chu-cai/${m.otherSlug}`}>
              <Button variant="outline" className="font-semibold">
                Xem bảng {m.other} ›
              </Button>
            </Link>
            <Link href="/luyen-viet">
              <Button variant="solid" className="font-semibold px-6 shadow-md shadow-shu/25">
                Tập viết tương tác ngay
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col">
          {rows.map((r) => {
            const header = r.group !== lastGroup ? ((lastGroup = r.group), GROUP_LABEL[r.group]) : null;
            return (
              <div key={`${r.group}-${r.row}`}>
                {header && (
                  <h2 className="mb-2 mt-10 flex items-center gap-3 font-mincho text-base font-bold text-genko first:mt-2">
                    <span>{header}</span>
                    <span className="h-px flex-1 bg-gradient-to-r from-rule via-rule/60 to-transparent" />
                  </h2>
                )}
                <section className="grid items-start gap-4 border-t border-rule/70 py-3 sm:grid-cols-[90px_1fr]">
                  <div className="flex items-baseline gap-2 pt-0 sm:block sm:pt-2">
                    <span className="block font-mincho text-[15px] font-bold text-genko">{r.label}</span>
                    <span className="text-[11px] font-semibold tracking-wider text-sumi-3 uppercase">{r.row}</span>
                  </div>
                  <div
                    className="grid justify-start gap-2 sm:gap-2.5"
                    style={{ gridTemplateColumns: `repeat(${r.cols}, minmax(0, 114px))` }}
                  >
                    {r.slots.map((c, i) =>
                      c ? (
                        <Link
                          key={c.c}
                          href={`/luyen-viet?c=${encodeURIComponent(c.c)}`}
                          title={`${c.c} — ${c.r}, đọc gần như "${c.vn}", ${c.n} nét`}
                          className="group relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl border border-rule/85 bg-surface p-1.5 shadow-2xs transition-all duration-200 hover:z-10 hover:-translate-y-1 hover:border-genko hover:shadow-lg"
                        >
                          <span className="font-mincho text-[clamp(26px,4.5vw,36px)] leading-none text-sumi transition-transform duration-200 group-hover:scale-105">
                            {c.c}
                          </span>
                          <span className="text-[11.5px] font-semibold text-sumi-3">{c.r}</span>
                          <span className="text-[10px] font-medium text-sumi-3 tnum">{c.n} nét</span>
                        </Link>
                      ) : (
                        <div
                          key={`v${i}`}
                          className="aspect-square rounded-xl border border-dashed border-rule/60 opacity-40 bg-paper-sunk/20"
                        />
                      ),
                    )}
                  </div>
                </section>
              </div>
            );
          })}
        </div>

        {/* Bảng phiên âm tiếng Việt gần đúng */}
        <section className="glass-card mt-16 rounded-3xl p-7 max-w-3xl">
          <h2 className="font-mincho text-2xl font-bold text-sumi">
            Cách đọc gần đúng sang tiếng Việt
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-sumi-2">
            Không âm tiếng Nhật nào trùng khít hoàn toàn với tiếng Việt, nên bảng dưới đây là điểm tựa ban đầu cho người mới bắt đầu.
            Hãy luyện nghe và tập viết để tay và tai cùng cảm nhận chuẩn xác.
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-3">
            {charsOf(m.script, "basic").map((c) => (
              <div key={c.c} className="flex items-center gap-3 border-b border-rule/60 py-1.5">
                <dt className="font-mincho text-lg font-bold text-sumi w-7 text-center">{c.c}</dt>
                <dd className="text-sumi-2 font-medium">{c.vn}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Khung CTA chuyển đổi */}
        <div className="glass-luxury mt-14 flex flex-col items-center gap-4 rounded-3xl p-8 text-center sm:p-12">
          <span className="hanko-seal px-3 py-1 text-base">
            道場
          </span>
          <h2 className="text-balance font-mincho text-2xl font-bold text-sumi sm:text-3xl">
            Nhìn bảng thôi chưa đủ để nhớ
          </h2>
          <p className="max-w-[46ch] text-base leading-relaxed text-sumi-2">
            Chỉ khi tự tay cầm bút vẽ từng nét, cơ bắp và não bộ mới ghi nhớ sâu sắc. Kana Dōjō chấm từng nét bạn viết và tự xếp lịch ôn lại theo thuật toán FSRS.
          </p>
          <Link href="/luyen-viet" className="pt-2">
            <Button variant="solid" size="lg" className="px-8 font-semibold shadow-lg shadow-shu/25">
              Bắt đầu tập viết {m.name} ngay
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
