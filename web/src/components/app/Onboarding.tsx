"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import { Brand } from "@/components/app/Brand";
import { Button, Card, Chip, Field, Notice } from "@/components/ui";
import { importBackup } from "@/lib/backup";
import { setDailyGoal } from "@/lib/learning/store";
import { PRESETS, applyPreset, type PresetId } from "@/lib/space/presets";
import { LIMITS, completeOnboarding } from "@/lib/space/space";
import { updateSpace } from "@/lib/space/store";

const GOALS = [
  { xp: 30, label: "Nhẹ nhàng", hint: "30 XP/ngày" },
  { xp: 50, label: "Vừa sức", hint: "50 XP/ngày" },
  { xp: 100, label: "Chăm chỉ", hint: "100 XP/ngày" },
];

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

/** Màn chào lần đầu: dựng "dōjō của riêng bạn". Không bắt buộc — "Bỏ qua" dùng cấu hình mặc định, mọi thứ đổi được ở Cài đặt. */
export function Onboarding() {
  const [name, setName] = useState("");
  const [preset, setPreset] = useState<PresetId>("full");
  const [goal, setGoal] = useState(50);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const start = () => {
    setDailyGoal(goal);
    updateSpace((s) => applyPreset(s, preset, name));
  };

  const skip = () => {
    updateSpace(completeOnboarding);
  };

  const restore = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES) return setError("Tệp quá lớn — đây không phải tệp sao lưu của Kana Dōjō.");
      const res = importBackup(await file.text());
      if (!res.ok) return setError(res.error);
      // Tệp sao lưu đầy đủ mang theo không gian đã dựng; tệp tiến độ cũ thì chỉ có tiến độ — vẫn phải qua bước dựng.
      if (res.kind === "progress-only") updateSpace(completeOnboarding);
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <div className="relative min-h-dvh bg-paper px-4 py-8 text-sumi sm:py-14">
      <div className="bg-genko-grid pointer-events-none fixed inset-0 z-0 opacity-[0.3]" />
      <div className="relative z-10 mx-auto flex max-w-2xl flex-col gap-6">
        <Brand href="/" tagline="Học tiếng Nhật theo cách của bạn" />

        <div>
          <h1 className="font-mincho text-2xl font-bold sm:text-3xl">Dựng dōjō của riêng bạn</h1>
          <p className="mt-2 text-sm leading-relaxed text-sumi-2">
            Ở đây bạn chọn công cụ, tự soạn tài liệu và quyết định cách học. Không cần tài khoản — mọi thứ nằm ngay trong
            trình duyệt này và không rời khỏi máy bạn. Chọn một điểm xuất phát; tất cả đổi được sau, trong <b>Cài đặt</b>.
          </p>
        </div>

        <Card className="flex flex-col gap-5 px-5 py-5">
          <Field
            label="Tên bạn muốn được gọi (tuỳ chọn)"
            value={name}
            maxLength={LIMITS.name}
            placeholder="Ví dụ: Vũ"
            autoComplete="off"
            onChange={(e) => setName(e.target.value)}
          />

          <fieldset className="flex flex-col gap-2.5">
            <legend className="label-xs mb-1">Bạn muốn bắt đầu thế nào?</legend>
            <div role="radiogroup" aria-label="Điểm xuất phát" className="grid gap-2.5">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={preset === p.id}
                  onClick={() => setPreset(p.id)}
                  className={clsx(
                    "flex cursor-pointer flex-col gap-0.5 rounded-2xl border px-4 py-3 text-left transition-all duration-150",
                    preset === p.id ? "border-shu bg-shu-tint/70 shadow-sm shadow-shu/10" : "border-rule/80 bg-surface hover:border-rule-firm hover:bg-surface-2",
                  )}
                >
                  <span className="text-[14px] font-bold text-sumi">{p.label}</span>
                  <span className="text-[12.5px] leading-snug text-sumi-3">{p.blurb}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="label-xs mb-1">Mục tiêu mỗi ngày</legend>
            <div className="flex flex-wrap gap-2">
              {GOALS.map((g) => (
                <Chip key={g.xp} active={goal === g.xp} onClick={() => setGoal(g.xp)}>
                  {g.label} · {g.hint}
                </Chip>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="solid" size="lg" onClick={start}>Bắt đầu</Button>
            <Button variant="ghost" onClick={skip}>Bỏ qua, dùng mặc định</Button>
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-3 text-[13px] text-sumi-3">
          <span>Đã có tệp sao lưu?</span>
          <Button size="sm" variant="outline" onClick={() => fileInput.current?.click()}>Khôi phục từ tệp…</Button>
          <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void restore(e.target.files?.[0])} />
        </div>
        {error && <Notice tone="err">{error}</Notice>}
      </div>
    </div>
  );
}
