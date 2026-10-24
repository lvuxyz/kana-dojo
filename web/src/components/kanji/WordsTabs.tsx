"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

/* Từ vựng và Kanji là một mô-đun trên thanh điều hướng (`vocab`): thêm mô-đun mới vào Space sẽ làm các tab cũ còn mở
   coi dữ liệu là hỏng (z.enum không biết giá trị mới). Thanh này là lối chuyển giữa hai trang. */

const TABS = [
  { href: "/tu-vung", label: "Từ vựng" },
  { href: "/kanji", label: "Kanji" },
] as const;

export function WordsTabs() {
  const path = usePathname();
  return (
    <nav aria-label="Từ vựng và Kanji" className="flex w-fit gap-1 rounded-xl border border-rule/80 bg-paper-sunk/80 p-1 shadow-inner">
      {TABS.map((t) => {
        const active = path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "rounded-lg px-4 py-1.5 text-xs font-semibold transition-all",
              active ? "bg-surface text-sumi shadow-sm ring-1 ring-black/5 dark:ring-white/10" : "text-sumi-3 hover:bg-surface/50 hover:text-sumi",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
