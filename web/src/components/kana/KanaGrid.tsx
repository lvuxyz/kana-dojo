"use client";

import clsx from "clsx";
import { GROUP_LABEL, rowsOf, type KanaChar, type KanaGroup, type Script, charsOf } from "@/lib/kana";

export interface CellState { level: 0 | 1 | 2; bestScore: number; due: boolean }

export function KanaGrid({
  script, group, states, onPick,
}: {
  script: Script;
  group: KanaGroup | "all";
  states: Map<string, CellState>;
  onPick: (c: KanaChar) => void;
}) {
  const rows = rowsOf(charsOf(script, group));
  let lastGroup: KanaGroup | null = null;

  return (
    <div className="flex flex-col">
      {rows.map((r) => {
        const header = r.group !== lastGroup ? ((lastGroup = r.group), GROUP_LABEL[r.group]) : null;
        return (
          <div key={`${r.group}-${r.row}`}>
            {header && (
              <div className="mb-0.5 mt-6 flex items-center gap-3 first:mt-1">
                <span className="font-mincho text-[13px] font-semibold text-genko">{header}</span>
                <span className="h-px flex-1 bg-rule" />
              </div>
            )}

            <section className="grid items-start gap-3.5 border-t border-rule py-2 sm:grid-cols-[88px_1fr]">
              <div className="flex items-baseline gap-2 pt-0 sm:block sm:pt-2">
                <span className="block font-mincho text-[15px] font-semibold leading-tight text-genko">{r.label}</span>
                <span className="text-[11px] tracking-wider text-sumi-3">{r.row}</span>
              </div>

              <div
                className="grid justify-start gap-1.5 sm:gap-2"
                style={{ gridTemplateColumns: `repeat(${r.cols}, minmax(0, var(--cell, 116px)))` }}
              >
                {r.slots.map((c, i) =>
                  c ? <Cell key={c.c} char={c} state={states.get(c.c)} onPick={onPick} />
                    : <div key={`v${i}`} className="aspect-square rounded-lg border border-dashed border-rule opacity-50" />,
                )}
              </div>
            </section>
          </div>
        );
      })}
    </div>
  );
}

function Cell({ char, state, onPick }: { char: KanaChar; state?: CellState; onPick: (c: KanaChar) => void }) {
  const level = state?.level ?? 0;
  return (
    <button
      onClick={() => onPick(char)}
      aria-label={`${char.c} — ${char.r}, ${char.n} nét`}
      className={clsx(
        "relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border bg-surface p-1",
        "transition-[transform,border-color,box-shadow] duration-150 hover:z-10 hover:-translate-y-0.5 hover:shadow-md",
        level === 2 ? "border-shu/40" : level === 1 ? "border-genko/35" : "border-rule",
        "hover:border-genko-2",
      )}
    >
      <span className="font-mincho text-[clamp(25px,4.4vw,35px)] leading-none tracking-tight">{char.c}</span>
      <span className="text-[11px] text-sumi-3">{char.r}</span>

      {/* Con dấu 済 — "đã xong" trong tiếng Nhật, thứ thầy cô đóng lên bài đạt */}
      {level === 2 && (
        <span className="absolute right-1 top-1 grid h-[15px] w-[15px] place-items-center rounded-[2px] bg-shu font-mincho text-[9px] font-semibold text-white">
          済
        </span>
      )}
      {state?.due && level > 0 && (
        <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-gold" title="Đến hạn ôn" />
      )}
      {level > 0 && (
        <span className="absolute inset-x-2 bottom-1.5 h-0.5 rounded-full bg-rule">
          <i className={clsx("block h-full rounded-full", level === 2 ? "bg-shu" : "bg-genko-2")}
             style={{ width: `${Math.min(100, state?.bestScore ?? 0)}%` }} />
        </span>
      )}
    </button>
  );
}
