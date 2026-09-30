"use client";

import clsx from "clsx";
import { ANSI_FALLBACK, JIS_KANA_ROWS, keyForKana, type LayoutKey } from "@/lib/typing/kana-layout";

interface Cap {
  code: string;
  label: string;
  /** Độ rộng theo đơn vị phím chuẩn */
  w?: number;
}

/* Hình học bàn phím US (ANSI) — loại phổ biến nhất ở Việt Nam. Ở chế độ kana, nhãn mỗi phím
 * lấy theo mã vị trí (KeyboardEvent.code), nên người dùng bàn phím JIS vẫn thấy đúng chữ. */
const ROWS: Cap[][] = [
  [
    { code: "Backquote", label: "`" },
    ..."1234567890".split("").map((d) => ({ code: `Digit${d}`, label: d })),
    { code: "Minus", label: "-" }, { code: "Equal", label: "=" }, { code: "Backspace", label: "⌫", w: 2 },
  ],
  [
    { code: "Tab", label: "Tab", w: 1.5 },
    ..."QWERTYUIOP".split("").map((c) => ({ code: `Key${c}`, label: c })),
    { code: "BracketLeft", label: "[" }, { code: "BracketRight", label: "]" }, { code: "Backslash", label: "\\", w: 1.5 },
  ],
  [
    { code: "CapsLock", label: "Caps", w: 1.75 },
    ..."ASDFGHJKL".split("").map((c) => ({ code: `Key${c}`, label: c })),
    { code: "Semicolon", label: ";" }, { code: "Quote", label: "'" }, { code: "Enter", label: "Enter", w: 2.25 },
  ],
  [
    { code: "ShiftLeft", label: "Shift", w: 2.25 },
    ..."ZXCVBNM".split("").map((c) => ({ code: `Key${c}`, label: c })),
    { code: "Comma", label: "," }, { code: "Period", label: "." }, { code: "Slash", label: "/" },
    { code: "ShiftRight", label: "Shift", w: 2.75 },
  ],
  [{ code: "Space", label: "", w: 6.25 }],
];

const KANA_BY_CODE = new Map<string, LayoutKey>(
  [...JIS_KANA_ROWS.flat(), ANSI_FALLBACK].map((k) => [k.code, k]),
);

const SHIFTED: Record<string, string> = { "!": "1", "?": "/", "~": "`" };
const PUNCT_CODE: Record<string, string> = {
  "-": "Minus", "'": "Quote", ",": "Comma", ".": "Period", "/": "Slash", "`": "Backquote",
  "[": "BracketLeft", "]": "BracketRight", ";": "Semicolon", "=": "Equal",
};

/** Phím vật lý cho một ký tự romaji. */
export function keyForRomaji(ch: string): { code: string; shift: boolean } | undefined {
  const base = SHIFTED[ch];
  const c = base ?? ch;
  let code: string | undefined;
  if (/^[a-z]$/i.test(c)) code = `Key${c.toUpperCase()}`;
  else if (/^\d$/.test(c)) code = `Digit${c}`;
  else code = PUNCT_CODE[c];
  return code ? { code, shift: !!base } : undefined;
}

/** Phím cho một token kana; ー và ろ nằm ở phím ¥, \ của JIS — bàn phím US dùng phím ` thay. */
export function keyForKanaToken(token: string) {
  if (token === "ー") return { code: "Backquote", shift: false };
  if (token === "ろ") return { code: "Backquote", shift: true };
  return keyForKana(token);
}

const LABELS = new Map(ROWS.flat().map((c) => [c.code, c.label || "Space"]));

/** Nhãn in trên phím US cho một mã phím. */
export function capLabel(code: string): string {
  return LABELS.get(code) ?? code;
}

const HOME = new Set(["KeyF", "KeyJ"]);

export function VirtualKeyboard({
  method,
  next,
  className,
}: {
  method: "ROMAJI" | "KANA";
  /** Ký tự/token kế tiếp cần gõ */
  next: string | undefined;
  className?: string;
}) {
  const target = next ? (method === "KANA" ? keyForKanaToken(next) : keyForRomaji(next)) : undefined;

  return (
    <div
      className={clsx("select-none rounded-2xl border border-rule/70 bg-paper-sunk/70 p-2.5 shadow-inner", className)}
      aria-hidden
    >
      <div className="flex flex-col gap-1">
        {ROWS.map((row, i) => (
          <div key={i} className="flex justify-center gap-1">
            {row.map((cap) => {
              const kana = method === "KANA" ? KANA_BY_CODE.get(cap.code) : undefined;
              const isTarget = target?.code === cap.code;
              const isShift = !!target?.shift && (cap.code === "ShiftLeft" || cap.code === "ShiftRight");
              return (
                <div
                  key={cap.code}
                  data-code={cap.code}
                  data-target={isTarget || isShift || undefined}
                  style={{ flexGrow: cap.w ?? 1, flexBasis: 0 }}
                  className={clsx(
                    "relative flex h-10 min-w-0 flex-col items-center justify-center rounded-lg border text-[11px] font-semibold transition-colors duration-100",
                    isTarget || isShift
                      ? "border-shu bg-shu text-white shadow-md shadow-shu/30"
                      : "border-rule/80 bg-surface text-sumi-2",
                  )}
                >
                  {kana?.kana ? (
                    <>
                      <span className={clsx("font-japanese text-[15px] leading-none", isTarget ? "text-white" : "text-sumi")}>
                        {kana.kana}
                      </span>
                      {kana.shiftKana && (
                        <span
                          className={clsx(
                            "absolute right-1 top-0.5 font-japanese text-[9.5px] leading-none",
                            isTarget ? "text-white/85" : "text-sumi-3",
                          )}
                        >
                          {kana.shiftKana}
                        </span>
                      )}
                      <span className={clsx("absolute bottom-0.5 left-1 text-[8.5px] leading-none", isTarget ? "text-white/75" : "text-sumi-3")}>
                        {cap.label}
                      </span>
                    </>
                  ) : (
                    <span className={clsx(cap.w ? "text-[10px] font-medium" : "text-[13px]")}>{cap.label}</span>
                  )}
                  {HOME.has(cap.code) && (
                    <span className={clsx("absolute bottom-1 h-0.5 w-2.5 rounded-full", isTarget ? "bg-white/80" : "bg-sumi-3/60")} />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {method === "KANA" && (
        <p className="mt-2 text-center text-[11px] text-sumi-3">
          Bố cục かな入力 (JIS). Bàn phím US không có phím <b>¥</b> và <b>ろ</b>: dùng <kbd className="font-mono">`</kbd> cho ー,
          {" "}<kbd className="font-mono">Shift + `</kbd> cho ろ.
        </p>
      )}
    </div>
  );
}
