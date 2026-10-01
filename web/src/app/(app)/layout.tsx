"use client";

import Link from "next/link";
import { Brand } from "@/components/app/Brand";
import { BottomNav, SideNav } from "@/components/app/Nav";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { Progress } from "@/components/ui";
import { usePersistent, useStats } from "@/lib/learning/hooks";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { stats, ready } = useStats();
  const persistent = usePersistent();

  return (
    <div className="relative min-h-screen bg-paper text-sumi">
      {/* Nền hoa văn lưới Genko mờ */}
      <div className="bg-genko-grid pointer-events-none fixed inset-0 z-0 opacity-[0.3]" />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-[1220px] gap-8 px-4 pb-24 lg:px-6 lg:pb-10">
        <aside className="hidden w-56 flex-none flex-col gap-6 py-6 lg:flex">
          <Brand href="/bang-dieu-khien" />
          <SideNav />
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 -mx-4 mb-7 flex items-center gap-4 border-b border-rule/70 bg-paper/85 px-4 py-3.5 backdrop-blur-xl lg:mx-0 lg:px-0">
            <div className="lg:hidden">
              <Brand href="/bang-dieu-khien" compact />
            </div>

            {ready ? (
              <>
                {/* Chuỗi ngày Streak rực lửa */}
                <div
                  className="flex items-center gap-2 rounded-full border border-shu/25 bg-shu-tint/80 px-3 py-1 text-xs font-bold text-shu shadow-xs backdrop-blur-xs"
                  title={`Chuỗi ${stats.currentStreak} ngày liên tục`}
                >
                  <span className="text-shu animate-pulse">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M12 2.5c.4 3.2-1.5 4.6-2.9 6C7.4 10 6 11.4 6 14a6 6 0 0 0 12 0c0-2.6-1.3-4.4-2.6-6.2-.5 1-1.2 1.6-2 1.8.5-2.6-.3-5.3-1.4-7.1Z" />
                    </svg>
                  </span>
                  <span className="tnum font-extrabold">{stats.currentStreak} ngày</span>
                </div>

                {/* Thanh tiến độ XP trong ngày */}
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="hidden whitespace-nowrap text-xs font-semibold text-sumi-2 sm:inline">
                    Mục tiêu <b className="tnum text-sumi">{stats.todayXp}</b>/{stats.dailyGoalXp} XP
                  </span>
                  <Progress value={stats.todayXp} max={stats.dailyGoalXp} tone="shu" className="min-w-16 flex-1" />
                </div>

                {/* Huy hiệu Cấp độ / Đẳng cấp Dōjō */}
                <span className="hidden whitespace-nowrap rounded-lg border border-gold/30 bg-gold-tint/80 px-2.5 py-1 text-xs font-bold text-gold md:inline">
                  Cấp <b className="tnum text-sumi">{stats.level}</b>
                </span>
              </>
            ) : (
              <div className="flex-1" />
            )}

            <ThemeToggle />
          </header>

          {!persistent && (
            <p role="alert" className="mb-5 rounded-2xl border border-gold/40 bg-gold-tint/80 px-4.5 py-3 text-xs font-semibold text-sumi-2 shadow-xs">
              Trình duyệt đang không cho lưu dữ liệu (có thể bạn đang ở chế độ riêng tư), nên tiến độ chỉ giữ được đến khi đóng
              tab này. Bạn vẫn học bình thường — vào <Link href="/cai-dat" className="underline">Cài đặt</Link> để tải tiến độ về máy trước khi thoát.
            </p>
          )}

          <main>{children}</main>
        </div>

        <BottomNav />
      </div>
    </div>
  );
}
