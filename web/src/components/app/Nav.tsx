"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const ICONS: Record<string, React.ReactNode> = {
  home: <><path d="M4 10.5 12 4l8 6.5" /><path d="M6 10v9h12v-9" /></>,
  review: <><path d="M4 12a8 8 0 1 1 2.6 5.9" /><path d="M4 20v-5h5" /></>,
  brush: <><path d="M6 18c2.5 0 3-1.5 3-3 0-1.4-1-2.4-2.4-2.4C5 12.6 4 13.9 4 15.6 4 17.6 5.4 19 7.6 19c4.6 0 8.4-5 8.4-9.6" /><path d="M14 4.5 19.5 10" /></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5Z" /><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5" /></>,
  quiz: <><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.4a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.7-.9 1.3v.4" /><path d="M12 16.6h.01" /></>,
  trophy: <><path d="M7 4h10v4a5 5 0 0 1-10 0Z" /><path d="M7 6H4.5v1A3.5 3.5 0 0 0 8 10.5" /><path d="M17 6h2.5v1a3.5 3.5 0 0 1-3.5 3.5" /><path d="M10 13v3.5h4V13" /><path d="M8 20h8" /></>,
  user: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c.8-3.6 3.5-5.5 7-5.5s6.2 1.9 7 5.5" /></>,
};

export const NAV = [
  { href: "/bang-dieu-khien", label: "Tổng quan", icon: "home" },
  { href: "/on-tap", label: "Ôn tập", icon: "review" },
  { href: "/luyen-viet", label: "Luyện viết", icon: "brush" },
  { href: "/tu-vung", label: "Từ vựng", icon: "book" },
  { href: "/quiz", label: "Quiz", icon: "quiz" },
  { href: "/bang-xep-hang", label: "Xếp hạng", icon: "trophy" },
  { href: "/ho-so", label: "Hồ sơ", icon: "user" },
] as const;

function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

export function SideNav() {
  const path = usePathname();
  return (
    <nav className="hidden lg:flex lg:flex-col lg:gap-1">
      {NAV.map((item) => {
        const active = path.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
              active
                ? "bg-surface text-sumi font-semibold shadow-xs border border-rule/70"
                : "text-sumi-2 hover:bg-paper-sunk hover:text-sumi",
            )}
          >
            {active && (
              <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-shu shadow-xs shadow-shu" />
            )}
            <span
              className={clsx(
                "transition-colors duration-200",
                active ? "text-shu" : "text-sumi-3 group-hover:text-sumi",
              )}
            >
              <Icon name={item.icon} />
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Trên điện thoại thanh điều hướng nằm dưới cùng — kính mờ cao cấp với điểm nhấn triện son */
export function BottomNav() {
  const path = usePathname();
  const items = NAV.slice(0, 5);
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-rule/80 bg-surface/90 shadow-lg backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map((item) => {
        const active = path.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-all duration-150",
              active ? "text-shu font-bold" : "text-sumi-3 hover:text-sumi",
            )}
          >
            {active && (
              <span className="absolute top-0 h-0.5 w-6 rounded-full bg-shu shadow-xs shadow-shu" />
            )}
            <span className={clsx("transition-transform duration-200", active && "scale-110")}>
              <Icon name={item.icon} />
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
