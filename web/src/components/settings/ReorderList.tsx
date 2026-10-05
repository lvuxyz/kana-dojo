"use client";

import clsx from "clsx";
import { Button, Switch } from "@/components/ui";

export interface ReorderItem<T extends string> {
  id: T;
  label: string;
  blurb: string;
  /** Luôn bật và đứng yên (ví dụ Tổng quan, Cài đặt). */
  locked?: boolean;
}

/**
 * Danh sách bật/tắt kèm sắp xếp bằng nút ▲▼ (dùng được bằng bàn phím và trình đọc màn hình, không cần kéo thả).
 * `enabled` là danh sách đang bật THEO THỨ TỰ; mục đang tắt hiện ở cuối. Mục `locked` không di chuyển và chặn việc
 * đổi chỗ qua nó.
 */
export function ReorderList<T extends string>({
  all, enabled, onChange,
}: {
  all: readonly ReorderItem<T>[];
  enabled: readonly T[];
  onChange: (next: T[]) => void;
}) {
  const info = new Map(all.map((i) => [i.id, i]));
  const on = enabled.filter((id) => info.has(id));
  const off = all.filter((i) => !on.includes(i.id));
  const isLocked = (id: T | undefined) => (id === undefined ? true : !!info.get(id)?.locked);

  const move = (index: number, dir: -1 | 1) => {
    const next = [...on];
    [next[index], next[index + dir]] = [next[index + dir], next[index]];
    onChange(next);
  };

  const row = (item: ReorderItem<T>, index: number | null) => {
    const checked = index !== null;
    return (
      <li key={item.id} className={clsx("flex items-start gap-3 rounded-xl border px-3.5 py-2.5", checked ? "border-rule/80 bg-surface" : "border-rule/50 bg-paper-sunk/40")}>
        <div className="min-w-0 flex-1">
          <Switch
            checked={checked}
            disabled={item.locked}
            onChange={(v) => onChange(v ? [...on, item.id] : on.filter((x) => x !== item.id))}
            label={item.label}
            hint={item.locked ? `${item.blurb} (luôn bật)` : item.blurb}
          />
        </div>
        {checked && !item.locked && (
          <span className="flex flex-none gap-1">
            <Button
              size="sm" variant="ghost" aria-label={`Đưa “${item.label}” lên`}
              disabled={index === 0 || isLocked(on[index - 1])}
              onClick={() => move(index, -1)}
            >▲</Button>
            <Button
              size="sm" variant="ghost" aria-label={`Đưa “${item.label}” xuống`}
              disabled={index === on.length - 1 || isLocked(on[index + 1])}
              onClick={() => move(index, 1)}
            >▼</Button>
          </span>
        )}
      </li>
    );
  };

  return (
    <ul className="flex flex-col gap-2">
      {on.map((id, i) => row(info.get(id)!, i))}
      {off.map((item) => row(item, null))}
    </ul>
  );
}
