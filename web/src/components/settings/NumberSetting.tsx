"use client";

import { useState } from "react";
import { Field } from "@/components/ui";

/** Ô số có kẹp khoảng: gõ thoải mái, chỉ áp (và kẹp) khi rời ô hoặc nhấn Enter — không giật số giữa lúc đang gõ. */
export function NumberSetting({
  label, hint, value, min, max, step = 1, suffix, onCommit,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onCommit: (n: number) => void;
}) {
  // null = chưa gõ gì: ô hiện giá trị đang lưu. Tách riêng để không phải đồng bộ state trong effect.
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const n = Number(draft);
    setDraft(null);
    if (draft.trim() !== "" && Number.isFinite(n)) onCommit(Math.min(Math.max(n, min), max));
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Field
        label={suffix ? `${label} (${suffix})` : label}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
      <p className="text-[11.5px] leading-relaxed text-sumi-3">
        {hint ? `${hint} ` : ""}Từ {min} đến {max}.
      </p>
    </div>
  );
}
