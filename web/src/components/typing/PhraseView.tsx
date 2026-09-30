"use client";

import clsx from "clsx";
import type { Phrase, Segment } from "@/lib/typing/phrases";

type Status = "done" | "current" | "todo";

const TONE: Record<Status, string> = {
  done: "text-genko/80",
  current: "text-shu",
  todo: "text-sumi",
};

/**
 * Câu mẫu với tiến độ gõ. `unit` cho biết `pos`/`curEnd` đếm theo gì:
 * - "kana": vị trí trong chuỗi kana phải gõ (romaji, kana JIS) — tô được tới từng chữ furigana;
 * - "ime": vị trí trong chữ hiển thị (IME) — cụm kanji chỉ xong khi đã đổi đúng chữ.
 */
export function PhraseView({
  phrase,
  unit,
  pos,
  curEnd,
  hidden = false,
  size = "lg",
}: {
  phrase: Phrase;
  unit: "kana" | "ime";
  pos: number;
  curEnd: number;
  /** Nghe chép: làm mờ phần chưa gõ */
  hidden?: boolean;
  size?: "lg" | "sm";
}) {
  const span = (s: Segment) => {
    const start = unit === "kana" ? s.start : s.imeStart;
    const len = s.reading ? (unit === "kana" ? s.reading.length : s.text.length) : 0;
    return { start, len };
  };

  const statusOf = (start: number, len: number): Status => {
    if (len === 0) return pos > start || (pos === start && start > 0) ? "done" : "todo";
    if (pos >= start + len) return "done";
    if (start < curEnd && start + len > pos) return "current";
    return "todo";
  };

  const veil = (st: Status) => hidden && st !== "done" && "blur-[12px] opacity-40 select-none";

  return (
    <p
      className={clsx(
        "flex flex-wrap items-end justify-center font-japanese leading-none",
        size === "lg" ? "gap-y-3 text-[34px] sm:text-5xl" : "text-lg",
      )}
      lang="ja"
    >
      {phrase.segments.map((s, i) => {
        const { start, len } = span(s);
        const st = statusOf(start, len);

        if (!s.text.trim()) return <span key={i} className={size === "lg" ? "w-4 sm:w-6" : "w-2"} />;

        if (!s.ruby) {
          return (
            <span key={i} className={clsx("relative transition-colors duration-100", TONE[st], veil(st), !s.reading && "opacity-60")}>
              {s.text}
              {st === "current" && size === "lg" && <Caret />}
            </span>
          );
        }

        return (
          <ruby key={i} className={clsx("relative transition-colors duration-100", TONE[st], veil(st))}>
            {s.text}
            <rt className={clsx("pb-1 font-sans font-medium tracking-wider", size === "lg" ? "text-[13px] sm:text-[15px]" : "text-[9px]")}>
              {unit === "kana"
                ? Array.from(s.reading, (ch, j) => {
                    const cst = statusOf(start + j, 1);
                    return (
                      <span key={j} className={clsx(TONE[cst], cst === "current" && "font-bold underline decoration-2 underline-offset-2")}>
                        {ch}
                      </span>
                    );
                  })
                : s.reading}
            </rt>
            {st === "current" && size === "lg" && <Caret />}
          </ruby>
        );
      })}
    </p>
  );
}

function Caret() {
  return <span className="absolute -bottom-2 left-0 right-0 h-[3px] rounded-full bg-shu shadow-sm shadow-shu/40" />;
}
