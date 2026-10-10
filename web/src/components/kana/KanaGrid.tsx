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
              <div className="mb-1 mt-7 flex items-center gap-3.5 first:mt-1">
                <span className="font-mincho text-sm font-bold text-genko tracking-wide">{header}</span>
                <span className="h-px flex-1 bg-gradient-to-r from-rule via-rule/60 to-transparent" />
              </div>
            )}

            <section className="grid items-start gap-2.5 sm:gap-4 border-t border-rule/70 py-2.5 sm:py-3 sm:grid-cols-[85px_1fr]">
              <div className="flex items-baseline gap-2 pt-0 sm:block sm:pt-2">
                <span className="block font-mincho text-sm sm:text-[15.5px] font-bold leading-tight text-genko">{r.label}</span>
                <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-sumi-3 uppercase">{r.row}</span>
              </div>

              <div
                className="grid w-full grid-cols-5 gap-1.5 sm:gap-2.5 max-w-[calc(5*116px+4*10px)]"
              >
                {r.slots.map((c, i) =>
                  c ? <Cell key={c.c} char={c} state={states.get(c.c)} onPick={onPick} />
                    : <div key={`v${i}`} className="aspect-square rounded-xl sm:rounded-2xl border border-dashed border-rule/60 opacity-40 bg-paper-sunk/20" />,
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
        "group relative flex aspect-square flex-col items-center justify-center rounded-xl sm:rounded-2xl border bg-surface p-1 sm:p-1.5 cursor-pointer select-none",
        "transition-all duration-200 hover:z-10 hover:-translate-y-0.5 hover:shadow-lg hover:border-genko active:scale-95",
        level === 2
          ? "border-shu/40 shadow-xs shadow-shu/10"
          : level === 1
          ? "border-genko/35 shadow-xs shadow-genko/10"
          : "border-rule/85 shadow-2xs",
      )}
    >
      <span className="font-mincho text-[clamp(21px,5.8vw,36px)] leading-none tracking-tight text-sumi transition-transform duration-200 group-hover:scale-105">
        {char.c}
      </span>
      <span className="mt-0.5 text-[10px] sm:text-[11.5px] font-semibold text-sumi-3 leading-none">{char.r}</span>

      {/* Con dấu triện son 済 — đóng dấu bài đạt */}
      {level === 2 && (
        <span className="absolute right-1 top-1 grid h-3.5 w-3.5 sm:h-4 sm:w-4 place-items-center rounded-[3px] bg-shu font-mincho text-[8.5px] sm:text-[9.5px] font-bold text-white shadow-2xs shadow-shu">
          済
        </span>
      )}

      {/* Chấm vàng nhắc đến hạn ôn FSRS */}
      {state?.due && level > 0 && (
        <span
          className="absolute left-1 top-1 h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-gold ring-[1.5px] sm:ring-2 ring-surface shadow-xs animate-pulse"
          title="Đến hạn ôn tập"
        />
      )}

      {/* Thanh đo điểm cao nhất */}
      {level > 0 && (
        <span className="absolute inset-x-2 bottom-1 h-0.5 sm:h-1 overflow-hidden rounded-full bg-rule/70">
          <i
            className={clsx("block h-full rounded-full transition-all duration-300", level === 2 ? "bg-shu" : "bg-genko")}
            style={{ width: `${Math.min(100, state?.bestScore ?? 0)}%` }}
          />
        </span>
      )}
    </button>
  );
}
