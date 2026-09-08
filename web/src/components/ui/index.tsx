"use client";

import clsx from "clsx";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

/* Không dùng thư viện component dựng sẵn: cả trang có đúng 3 màu nghiệp vụ
   (giấy / mực / chu sa) và mọi thứ dưới đây bám theo đó. Kéo shadcn vào sẽ làm
   sản phẩm trông y hệt mọi sản phẩm khác. */

type BtnVariant = "solid" | "outline" | "ghost" | "danger";
type BtnSize = "sm" | "md" | "lg";

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors " +
  "disabled:cursor-not-allowed disabled:opacity-40";

const BTN_VARIANT: Record<BtnVariant, string> = {
  solid: "bg-sumi text-paper hover:bg-sumi-2",
  outline: "border border-rule bg-surface text-sumi hover:border-rule-firm hover:bg-surface-2",
  ghost: "text-sumi-3 hover:text-shu",
  danger: "bg-shu text-white hover:bg-shu-2",
};

const BTN_SIZE: Record<BtnSize, string> = {
  sm: "px-3 py-1.5 text-[13px]",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-[15px]",
};

export function Button({
  variant = "outline", size = "md", className, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize }) {
  return <button className={clsx(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], className)} {...rest} />;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={clsx("rounded-xl border border-rule bg-surface", className)}>{children}</div>
  );
}

export function Chip({
  active, className, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      aria-pressed={active}
      className={clsx(
        "rounded-full border px-3.5 py-1.5 text-[13px] transition-colors",
        active
          ? "border-sumi bg-sumi text-paper"
          : "border-rule bg-surface text-sumi-2 hover:border-rule-firm hover:text-sumi",
        className,
      )}
      {...rest}
    />
  );
}

export function Seg<T extends string>({
  value, options, onChange, className,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={clsx("flex gap-0.5 rounded-lg border border-rule bg-paper-sunk p-[3px]", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={clsx(
            "flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            value === o.value ? "bg-surface text-sumi shadow-sm" : "text-sumi-2 hover:text-sumi",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Progress({ value, max = 100, tone = "shu", className }: {
  value: number; max?: number; tone?: "shu" | "genko"; className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={clsx("h-1.5 overflow-hidden rounded-full bg-rule", className)}
         role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div
        className={clsx("h-full rounded-full transition-[width] duration-500",
          tone === "shu" ? "bg-shu" : "bg-genko")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Field({
  label, error, className, ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-xs">{label}</span>
      <input
        className={clsx(
          "rounded-lg border bg-surface px-3 py-2 text-sm text-sumi outline-none transition-colors",
          error ? "border-shu" : "border-rule focus:border-rule-firm",
          className,
        )}
        aria-invalid={!!error}
        {...rest}
      />
      {error && <span className="text-xs text-shu">{error}</span>}
    </label>
  );
}

export function Stat({ label, value, sub, tone }: {
  label: string; value: ReactNode; sub?: ReactNode; tone?: "shu" | "genko" | "gold";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="label-xs">{label}</span>
      <span className={clsx(
        "font-mincho text-2xl font-semibold leading-none tnum",
        tone === "shu" && "text-shu", tone === "genko" && "text-genko", tone === "gold" && "text-gold",
      )}>{value}</span>
      {sub && <span className="text-xs text-sumi-3">{sub}</span>}
    </div>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-rule px-6 py-14 text-center">
      <p className="font-mincho text-lg text-sumi">{title}</p>
      {hint && <p className="max-w-sm text-sm text-sumi-3">{hint}</p>}
      {action}
    </div>
  );
}

export function Spinner({ label = "Đang tải" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-sumi-3">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-rule border-t-shu" />
      {label}…
    </div>
  );
}
