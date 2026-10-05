import { Fragment } from "react";
import { parseMarkup, type Inline } from "@/lib/space/markup";

/* Hiển thị ghi chú. Dựng phần tử React từ cây do parseMarkup sinh ra — không bao giờ chèn HTML thô. */

function Inlines({ list }: { list: Inline[] }) {
  return (
    <>
      {list.map((n, i) => {
        switch (n.t) {
          case "text": return <Fragment key={i}>{n.v}</Fragment>;
          case "bold": return <b key={i} className="font-bold text-sumi">{n.v}</b>;
          case "code": return <code key={i} className="rounded bg-paper-sunk px-1 font-mono text-[0.9em]">{n.v}</code>;
          case "br": return <br key={i} />;
          case "ruby":
            return (
              <ruby key={i} lang="ja" className="font-japanese">
                {n.base}
                <rt className="text-[0.55em] font-normal text-sumi-3">{n.rt}</rt>
              </ruby>
            );
        }
      })}
    </>
  );
}

export function RichText({ source, className }: { source: string; className?: string }) {
  const blocks = parseMarkup(source);
  if (blocks.length === 0) return <p className="text-sm text-sumi-3">Ghi chú đang trống.</p>;
  return (
    <div className={className ?? "flex flex-col gap-3 text-[14.5px] leading-[1.9] text-sumi-2"}>
      {blocks.map((b, i) => {
        switch (b.t) {
          case "heading": {
            const size = b.level === 1 ? "text-xl" : b.level === 2 ? "text-lg" : "text-base";
            return <p key={i} role="heading" aria-level={b.level + 1} className={`font-mincho ${size} font-bold text-sumi`}><Inlines list={b.inline} /></p>;
          }
          case "para": return <p key={i}><Inlines list={b.inline} /></p>;
          case "ul": return <ul key={i} className="list-disc pl-6">{b.items.map((it, j) => <li key={j}><Inlines list={it} /></li>)}</ul>;
          case "ol": return <ol key={i} className="list-decimal pl-6">{b.items.map((it, j) => <li key={j}><Inlines list={it} /></li>)}</ol>;
          case "quote": return <blockquote key={i} className="border-l-2 border-genko/40 pl-3 text-sumi-3"><Inlines list={b.inline} /></blockquote>;
          case "hr": return <hr key={i} className="border-rule" />;
        }
      })}
    </div>
  );
}
