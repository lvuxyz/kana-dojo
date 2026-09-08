import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Brand } from "@/components/app/Brand";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { Button } from "@/components/ui";
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
    <>
      <header className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-4">
        <Brand />
        <nav className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link href="/dang-ky"><Button size="sm" variant="solid">Tập viết miễn phí</Button></Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-16">
        <h1 className="text-balance font-mincho text-3xl font-semibold sm:text-4xl">
          Bảng chữ cái {m.name} <span className="text-sumi-3">({m.jp})</span>
        </h1>
        <p className="mt-3 max-w-[62ch] leading-relaxed text-sumi-2">{m.intro}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={`/bang-chu-cai/${m.otherSlug}`}><Button>Xem bảng {m.other} ›</Button></Link>
          <Link href="/dang-ky"><Button variant="solid">Tập viết ngay</Button></Link>
        </div>

        <div className="mt-9 flex flex-col">
          {rows.map((r) => {
            const header = r.group !== lastGroup ? ((lastGroup = r.group), GROUP_LABEL[r.group]) : null;
            return (
              <div key={`${r.group}-${r.row}`}>
                {header && (
                  <h2 className="mb-1 mt-8 flex items-center gap-3 font-mincho text-[15px] font-semibold text-genko first:mt-2">
                    {header}<span className="h-px flex-1 bg-rule" />
                  </h2>
                )}
                <section className="grid items-start gap-3.5 border-t border-rule py-2 sm:grid-cols-[84px_1fr]">
                  <div className="flex items-baseline gap-2 pt-0 sm:block sm:pt-2">
                    <span className="block font-mincho text-[15px] font-semibold text-genko">{r.label}</span>
                    <span className="text-[11px] tracking-wider text-sumi-3">{r.row}</span>
                  </div>
                  <div
                    className="grid justify-start gap-1.5 sm:gap-2"
                    style={{ gridTemplateColumns: `repeat(${r.cols}, minmax(0, 112px))` }}
                  >
                    {r.slots.map((c, i) =>
                      c ? (
                        <Link
                          key={c.c}
                          href="/dang-ky"
                          title={`${c.c} — ${c.r}, đọc gần như "${c.vn}", ${c.n} nét`}
                          className="flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border border-rule bg-surface p-1 transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-genko-2 hover:shadow-md"
                        >
                          <span className="font-mincho text-[clamp(24px,4.4vw,34px)] leading-none">{c.c}</span>
                          <span className="text-[11px] text-sumi-3">{c.r}</span>
                          <span className="text-[10px] text-sumi-3 tnum">{c.n} nét</span>
                        </Link>
                      ) : (
                        <div key={`v${i}`} className="aspect-square rounded-lg border border-dashed border-rule opacity-50" />
                      ),
                    )}
                  </div>
                </section>
              </div>
            );
          })}
        </div>

        <section className="mt-14 max-w-[62ch]">
          <h2 className="font-mincho text-2xl font-semibold">Cách đọc gần đúng sang tiếng Việt</h2>
          <p className="mt-3 leading-relaxed text-sumi-2">
            Không âm tiếng Nhật nào trùng khít với tiếng Việt, nên bảng dưới chỉ là điểm tựa ban đầu —
            hãy nghe phát âm chuẩn càng sớm càng tốt.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[14px] sm:grid-cols-3">
            {charsOf(m.script, "basic").map((c) => (
              <div key={c.c} className="flex gap-2 border-b border-rule py-1">
                <dt className="font-mincho w-8">{c.c}</dt>
                <dd className="text-sumi-2">{c.vn}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-12 flex flex-col items-center gap-3 rounded-xl border border-rule bg-surface px-6 py-10 text-center">
          <h2 className="text-balance font-mincho text-2xl font-semibold">Nhìn bảng thôi chưa đủ để nhớ</h2>
          <p className="max-w-[46ch] text-[15px] text-sumi-2">
            Viết ra tay mới nhớ được. Kana Dōjō chấm từng nét bạn viết và tự nhắc ôn đúng ngày trí nhớ sắp phai.
          </p>
          <Link href="/dang-ky"><Button variant="solid" size="lg">Bắt đầu tập viết {m.name}</Button></Link>
        </div>
      </main>
    </>
  );
}
