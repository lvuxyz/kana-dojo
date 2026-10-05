"use client";

import clsx from "clsx";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type BtnVariant = "solid" | "outline" | "ghost" | "danger" | "cinnabar" | "sumi" | "gold";
type BtnSize = "sm" | "md" | "lg";

const BTN_BASE =
  "relative inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 " +
  "disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98] select-none cursor-pointer";

const BTN_VARIANT: Record<BtnVariant, string> = {
  solid:
    "bg-gradient-to-r from-shu via-shu to-shu-2 text-white shadow-md shadow-shu/25 hover:shadow-lg hover:shadow-shu/35 hover:brightness-105 ring-1 ring-inset ring-white/20 shimmer-sweep",
  cinnabar:
    "bg-gradient-to-r from-shu via-shu to-shu-2 text-white shadow-md shadow-shu/25 hover:shadow-lg hover:shadow-shu/35 hover:brightness-105 ring-1 ring-inset ring-white/20 shimmer-sweep",
  gold:
    "bg-gradient-to-r from-gold to-gold-2 text-white shadow-md shadow-gold/25 hover:shadow-lg hover:shadow-gold/35 hover:brightness-105 ring-1 ring-inset ring-white/20",
  sumi:
    "bg-sumi text-paper hover:bg-sumi-2 shadow-sm ring-1 ring-inset ring-white/10",
  outline:
    "border border-rule/90 bg-surface/85 text-sumi backdrop-blur-md hover:border-rule-firm hover:bg-surface shadow-xs hover:shadow-sm",
  ghost:
    "text-sumi-2 hover:bg-rule/30 hover:text-sumi transition-colors",
  danger:
    "bg-shu text-white hover:bg-shu-2 shadow-xs shadow-shu/20",
};

const BTN_SIZE: Record<BtnSize, string> = {
  sm: "px-3.5 py-1.5 text-[12.5px] rounded-lg",
  md: "px-4.5 py-2 text-sm rounded-xl",
  lg: "px-6 py-3 text-[15px] font-semibold tracking-wide rounded-2xl",
};

export function Button({
  variant = "outline",
  size = "md",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize }) {
  return (
    <button className={clsx(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], className)} {...rest}>
      {children}
    </button>
  );
}

export function Card({
  className,
  children,
  variant = "default",
}: {
  className?: string;
  children: ReactNode;
  variant?: "default" | "glass" | "luxury" | "interactive";
}) {
  return (
    <div
      className={clsx(
        "rounded-2xl border transition-all duration-200",
        variant === "default" && "border-rule/80 bg-surface shadow-xs",
        variant === "glass" && "glass-card",
        variant === "luxury" && "glass-luxury",
        variant === "interactive" &&
          "glass-card hover:-translate-y-1 hover:shadow-lg hover:border-rule-firm/80",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  variant = "neutral",
  size = "md",
  className,
}: {
  children: ReactNode;
  variant?: "neutral" | "shu" | "genko" | "gold";
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 font-sans font-semibold tracking-wide rounded-full border",
        size === "sm" ? "px-2.5 py-0.5 text-[10.5px]" : "px-3.5 py-1 text-xs",
        variant === "neutral" && "border-rule/70 bg-paper-sunk text-sumi-2",
        variant === "shu" && "border-shu/25 bg-shu-tint text-shu-2",
        variant === "genko" && "border-genko/25 bg-genko-tint text-genko",
        variant === "gold" && "border-gold/30 bg-gold-tint text-gold",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Chip({
  active,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      aria-pressed={active}
      className={clsx(
        "rounded-full border px-4 py-1.5 text-[13px] font-medium transition-all duration-150 cursor-pointer",
        active
          ? "border-shu bg-shu text-white shadow-sm shadow-shu/25 scale-[1.02]"
          : "border-rule/80 bg-surface/80 text-sumi-2 hover:border-rule-firm hover:text-sumi hover:bg-surface",
        className,
      )}
      {...rest}
    />
  );
}

export function Seg<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={clsx("flex gap-1 rounded-xl border border-rule/80 bg-paper-sunk/80 p-1 shadow-inner", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={clsx(
            "flex-1 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer",
            value === o.value
              ? "bg-surface text-sumi shadow-sm ring-1 ring-black/5 dark:ring-white/10"
              : "text-sumi-3 hover:text-sumi hover:bg-surface/50",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Progress({
  value,
  max = 100,
  tone = "shu",
  className,
}: {
  value: number;
  max?: number;
  tone?: "shu" | "genko" | "gold";
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className={clsx("relative h-2.5 overflow-hidden rounded-full bg-rule/70 shadow-inner", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={clsx(
          "h-full rounded-full transition-all duration-500 relative",
          tone === "shu" && "bg-gradient-to-r from-shu to-shu-2",
          tone === "genko" && "bg-gradient-to-r from-genko to-genko-2",
          tone === "gold" && "bg-gradient-to-r from-gold to-gold-2",
        )}
        style={{ width: `${pct}%` }}
      >
        <span className="absolute right-0 top-0 bottom-0 w-2 rounded-full bg-white/40 blur-[1px]" />
      </div>
    </div>
  );
}

export function Field({
  label,
  error,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; ref?: Ref<HTMLInputElement> }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-xs">{label}</span>
      <input
        className={clsx(
          "rounded-xl border bg-surface/90 px-4 py-2.5 text-sm text-sumi shadow-xs outline-none transition-all duration-200",
          error
            ? "border-shu ring-2 ring-shu/20"
            : "border-rule/80 focus:border-shu focus:ring-3 focus:ring-shu/15",
          className,
        )}
        aria-invalid={!!error}
        {...rest}
      />
      {error && <span className="text-xs font-medium text-shu">{error}</span>}
    </label>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "shu" | "genko" | "gold";
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="label-xs">{label}</span>
      <span
        className={clsx(
          "font-mincho text-2xl font-bold leading-none tnum tracking-tight sm:text-3xl",
          tone === "shu" && "text-shu",
          tone === "genko" && "text-genko",
          tone === "gold" && "text-gold",
        )}
      >
        {value}
      </span>
      {sub && <span className="text-xs font-medium text-sumi-3">{sub}</span>}
    </div>
  );
}

export function Empty({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-rule/90 bg-surface/40 px-6 py-14 text-center backdrop-blur-xs">
      <p className="font-mincho text-xl font-bold text-sumi">{title}</p>
      {hint && <p className="max-w-sm text-sm text-sumi-3">{hint}</p>}
      {action}
    </div>
  );
}

export function Spinner({ label = "Đang tải" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-sm font-medium text-sumi-3">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-rule border-t-shu" />
      <span>{label}…</span>
    </div>
  );
}

export function TextArea({
  label,
  error,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="label-xs">{label}</span>}
      <textarea
        className={clsx(
          "rounded-xl border bg-surface/90 px-4 py-2.5 text-sm leading-relaxed text-sumi shadow-xs outline-none transition-all duration-200",
          error
            ? "border-shu ring-2 ring-shu/20"
            : "border-rule/80 focus:border-shu focus:ring-3 focus:ring-shu/15",
          className,
        )}
        aria-invalid={!!error}
        {...rest}
      />
      {error && <span className="text-xs font-medium text-shu">{error}</span>}
    </label>
  );
}

export function Select({
  label,
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="label-xs">{label}</span>}
      <select
        className={clsx(
          "rounded-xl border border-rule/80 bg-surface/90 px-3.5 py-2.5 text-sm text-sumi shadow-xs outline-none transition-all duration-200",
          "focus:border-shu focus:ring-3 focus:ring-shu/15",
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    </label>
  );
}

/** Công tắc bật/tắt kèm nhãn và dòng giải thích — dùng cho mọi lựa chọn có/không của người học. */
export function Switch({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  const on = checked && !disabled;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex cursor-pointer items-start gap-3 text-left disabled:cursor-not-allowed disabled:opacity-45"
    >
      <span className={clsx("relative mt-0.5 h-5 w-9 flex-none rounded-full transition-colors", on ? "bg-shu" : "bg-rule-firm")}>
        <span
          className={clsx(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all",
            on ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
      <span className="flex flex-col">
        <span className="text-[13px] font-semibold text-sumi">{label}</span>
        {hint && <span className="text-[12px] text-sumi-3">{hint}</span>}
      </span>
    </button>
  );
}

/** Thông báo ngắn sau một thao tác (đã lưu / lỗi). `role=status` để trình đọc màn hình đọc lên. */
export function Notice({ tone, children, className }: { tone: "ok" | "err"; children: ReactNode; className?: string }) {
  return (
    <p
      role={tone === "err" ? "alert" : "status"}
      className={clsx(
        "rounded-xl border px-3.5 py-2.5 text-[13px] font-semibold",
        tone === "ok" ? "border-genko/30 bg-genko-tint text-genko" : "border-shu/30 bg-shu-tint text-shu-2",
        className,
      )}
    >
      {children}
    </p>
  );
}
