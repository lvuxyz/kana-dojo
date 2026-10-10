"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Brand } from "@/components/app/Brand";
import { BottomNav, SideNav } from "@/components/app/Nav";
import { Onboarding } from "@/components/app/Onboarding";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { Progress } from "@/components/ui";
import { usePersistent, useProgress, useStats } from "@/lib/learning/hooks";
import { useSpace, useSpacePersistent } from "@/lib/space/hooks";
import { completeOnboarding } from "@/lib/space/space";
import { updateSpace } from "@/lib/space/store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { stats, ready } = useStats();
  const { state, ready: progressReady } = useProgress();
  const { space, ready: spaceReady } = useSpace();
  // Hai kho lưu độc lập: cảnh báo nếu một trong hai không ghi được. Gọi cả hai hook trước rồi mới gộp (không dùng &&,
  // vì vế đầu sai sẽ bỏ qua hook thứ hai và làm thứ tự hook đổi giữa các lần render).
  const progressPersistent = usePersistent();
  const spacePersistent = useSpacePersistent();
  const persistent = progressPersistent && spacePersistent;

  // Người đã học từ trước khi có "không gian riêng" không phải qua màn chào: họ đã có thói quen riêng của mình.
  const returning = progressReady && (state.stats.xpTotal > 0 || Object.keys(state.cards).length > 0);
  const needsOnboarding = spaceReady && progressReady && !space.onboarded && !returning;

  useEffect(() => {
    if (spaceReady && !space.onboarded && returning) updateSpace(completeOnboarding);
  }, [spaceReady, space.onboarded, returning]);

  if (needsOnboarding) return <Onboarding />;

  const name = space.profile.name;
  const tagline = spaceReady && name ? `Dōjō của ${name}` : "Học tiếng Nhật theo cách của bạn";

  return (
    <div className="relative min-h-screen bg-paper text-sumi">
      {/* Nền hoa văn lưới Genko mờ */}
      <div className="bg-genko-grid pointer-events-none fixed inset-0 z-0 opacity-[0.3]" />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-[1220px] gap-8 px-4 pb-24 lg:px-6 lg:pb-10">
        <aside className="hidden w-56 flex-none flex-col gap-6 py-6 lg:flex">
          <Brand href="/bang-dieu-khien" tagline={tagline} />
          <SideNav />
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 -mx-4 mb-7 flex items-center gap-2 sm:gap-4 border-b border-rule/70 bg-paper/85 px-4 py-3 backdrop-blur-xl lg:mx-0 lg:px-0 sm:py-3.5">
            <div className="shrink-0 lg:hidden">
              <Brand href="/bang-dieu-khien" compact />
            </div>

            {ready ? (
              <>
                {/* Chuỗi ngày Streak rực lửa */}
                <div
                  className="flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-full border border-shu/25 bg-shu-tint/80 px-2 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-bold text-shu shadow-xs backdrop-blur-xs"
                  title={`Chuỗi ${stats.currentStreak} ngày liên tục`}
                >
                  <span className="text-shu animate-pulse">
                    <svg viewBox="0 0 24 24" width="14" height="14" className="sm:h-4 sm:w-4" fill="currentColor">
                      <path d="M12 2.5c.4 3.2-1.5 4.6-2.9 6C7.4 10 6 11.4 6 14a6 6 0 0 0 12 0c0-2.6-1.3-4.4-2.6-6.2-.5 1-1.2 1.6-2 1.8.5-2.6-.3-5.3-1.4-7.1Z" />
                    </svg>
                  </span>
                  <span className="tnum font-extrabold">{stats.currentStreak}<span className="hidden sm:inline"> ngày</span></span>
                </div>

                {/* Thanh tiến độ XP trong ngày */}
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                  <span className="hidden whitespace-nowrap text-xs font-semibold text-sumi-2 sm:inline">
                    Mục tiêu <b className="tnum text-sumi">{stats.todayXp}</b>/{stats.dailyGoalXp} XP
                  </span>
                  <Progress value={stats.todayXp} max={stats.dailyGoalXp} tone="shu" className="min-w-8 flex-1 sm:min-w-16" />
                </div>

                {/* Huy hiệu Cấp độ / Đẳng cấp Dōjō */}
                <span className="hidden whitespace-nowrap rounded-lg border border-gold/30 bg-gold-tint/80 px-2.5 py-1 text-xs font-bold text-gold md:inline">
                  Cấp <b className="tnum text-sumi">{stats.level}</b>
                </span>
              </>
            ) : (
              <div className="flex-1" />
            )}

            <div className="shrink-0">
              <ThemeToggle />
            </div>
          </header>

          {!persistent && (
            <p role="alert" className="mb-5 rounded-2xl border border-gold/40 bg-gold-tint/80 px-4.5 py-3 text-xs font-semibold text-sumi-2 shadow-xs">
              Trình duyệt đang không cho lưu dữ liệu (có thể bạn đang ở chế độ riêng tư, hoặc bộ nhớ đã đầy), nên tiến độ,
              ghi chú và bộ thẻ chỉ giữ được đến khi đóng tab này. Bạn vẫn dùng bình thường — vào{" "}
              <Link href="/cai-dat?tab=data" className="underline">Cài đặt › Dữ liệu</Link> để tải bản sao lưu về máy trước khi thoát.
            </p>
          )}

          <main>{children}</main>
        </div>

        <BottomNav />
      </div>
    </div>
  );
}
