"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useSpace } from "@/lib/space/hooks";
import { navItemsOf, type ModuleInfo } from "@/lib/space/modules";

const ICONS: Record<ModuleInfo["icon"] | "more", React.ReactNode> = {
  home: <><path d="M4 10.5 12 4l8 6.5" /><path d="M6 10v9h12v-9" /></>,
  review: <><path d="M4 12a8 8 0 1 1 2.6 5.9" /><path d="M4 20v-5h5" /></>,
  brush: <><path d="M6 18c2.5 0 3-1.5 3-3 0-1.4-1-2.4-2.4-2.4C5 12.6 4 13.9 4 15.6 4 17.6 5.4 19 7.6 19c4.6 0 8.4-5 8.4-9.6" /><path d="M14 4.5 19.5 10" /></>,
  keyboard: <><rect x="3" y="6.5" width="18" height="11" rx="2.2" /><path d="M7 10.5h.01M10.5 10.5h.01M14 10.5h.01M17.5 10.5h.01M8 14h8" /></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5Z" /><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5" /></>,
  quiz: <><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.4a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.7-.9 1.3v.4" /><path d="M12 16.6h.01" /></>,
  library: <><path d="M5 4.5h11a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3Z" /><path d="M5 17a3 3 0 0 1 3-3h11" /><path d="M9 8h6" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" /></>,
  more: <><circle cx="6" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="18" cy="12" r="1.2" /></>,
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

/** Mục điều hướng theo công cụ và thứ tự người học đã chọn. Chưa đọc được lựa chọn (render phía máy chủ, lúc hydrate)
 *  thì chưa vẽ mục nào thay vì vẽ bản mặc định rồi đổi — tránh nháy các mục sẽ biến mất. */
function useNavItems(): ModuleInfo[] {
  const { space, ready } = useSpace();
  return ready ? navItemsOf(space) : [];
}

export function SideNav() {
  const path = usePathname();
  const items = useNavItems();
  return (
    <nav className="hidden lg:flex lg:flex-col lg:gap-1" aria-label="Điều hướng chính">
      {items.map((item) => {
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

/** Quá nhiều mục thì thanh dưới không đủ chỗ: giữ MAX_BAR mục đầu (do người học xếp), phần còn lại vào "Thêm". */
const MAX_BAR = 6;

/** Trên điện thoại thanh điều hướng nằm dưới cùng — kính mờ cao cấp với điểm nhấn triện son */
export function BottomNav() {
  const path = usePathname();
  const all = useNavItems();
  const [open, setOpen] = useState(false);

  const overflow = all.length > MAX_BAR;
  const bar = overflow ? all.slice(0, MAX_BAR - 1) : all;
  const rest = overflow ? all.slice(MAX_BAR - 1) : [];
  const restActive = rest.some((i) => path.startsWith(i.href));

  const tab = (item: ModuleInfo) => {
    const active = path.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={clsx(
          "relative flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium whitespace-nowrap transition-all duration-150",
          active ? "text-shu font-bold" : "text-sumi-3 hover:text-sumi",
        )}
      >
        {active && <span className="absolute top-0 h-0.5 w-6 rounded-full bg-shu shadow-xs shadow-shu" />}
        <span className={clsx("transition-transform duration-200", active && "scale-110")}>
          <Icon name={item.icon} />
        </span>
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {open && rest.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden" onClick={() => setOpen(false)}>
          <ul
            className="absolute inset-x-3 flex flex-col gap-1 rounded-2xl border border-rule/80 bg-surface p-2 shadow-lg"
            style={{ bottom: "calc(env(safe-area-inset-bottom) + 4.25rem)" }}
          >
            {rest.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={path.startsWith(item.href) ? "page" : undefined}
                  className={clsx(
                    "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium",
                    path.startsWith(item.href) ? "bg-shu-tint text-shu" : "text-sumi-2 hover:bg-paper-sunk",
                  )}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <nav
        aria-label="Điều hướng chính"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-rule/80 bg-surface/90 shadow-lg backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {bar.map(tab)}
        {overflow && (
          <button
            type="button"
            aria-expanded={open}
            aria-haspopup="true"
            onClick={() => setOpen((v) => !v)}
            className={clsx(
              "relative flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-1 py-2.5 text-[10px] font-medium whitespace-nowrap transition-all duration-150",
              open || restActive ? "text-shu font-bold" : "text-sumi-3 hover:text-sumi",
            )}
          >
            {restActive && <span className="absolute top-0 h-0.5 w-6 rounded-full bg-shu shadow-xs shadow-shu" />}
            <Icon name="more" />
            <span>Thêm</span>
          </button>
        )}
      </nav>
    </>
  );
}
