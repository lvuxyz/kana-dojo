"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Brand } from "@/components/app/Brand";
import { BottomNav, SideNav } from "@/components/app/Nav";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { Progress, Spinner } from "@/components/ui";
import type { StatsDto } from "@/lib/types";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/dang-nhap");
  }, [loading, user, router]);

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: () => get<StatsDto>("/stats/me"),
    enabled: !!user,
  });

  if (loading || !user) return <div className="grid min-h-dvh place-items-center"><Spinner /></div>;

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1180px] gap-8 px-4 pb-24 lg:px-6 lg:pb-8">
      <aside className="hidden w-52 flex-none flex-col gap-6 py-5 lg:flex">
        <Brand href="/bang-dieu-khien" />
        <SideNav />
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 -mx-4 mb-6 flex items-center gap-4 border-b border-rule bg-paper/90 px-4 py-3 backdrop-blur lg:mx-0 lg:px-0">
          <div className="lg:hidden"><Brand href="/bang-dieu-khien" compact /></div>

          {stats && (
            <>
              <div className="flex items-center gap-1.5" title={`Chuỗi ${stats.currentStreak} ngày`}>
                <span className="text-shu">
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
                    <path d="M12 2.5c.4 3.2-1.5 4.6-2.9 6C7.4 10 6 11.4 6 14a6 6 0 0 0 12 0c0-2.6-1.3-4.4-2.6-6.2-.5 1-1.2 1.6-2 1.8.5-2.6-.3-5.3-1.4-7.1Z" />
                  </svg>
                </span>
                <b className="tnum text-sm">{stats.currentStreak}</b>
              </div>

              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span className="hidden whitespace-nowrap text-xs text-sumi-2 sm:inline">
                  Mục tiêu hôm nay <b className="tnum">{stats.todayXp}</b>/{stats.dailyGoalXp} XP
                </span>
                <Progress value={stats.todayXp} max={stats.dailyGoalXp} className="min-w-16 flex-1" />
              </div>

              <span className="hidden whitespace-nowrap text-xs text-sumi-3 md:inline">
                Cấp <b className="tnum text-sumi">{stats.level}</b>
              </span>
            </>
          )}

          <ThemeToggle />
        </header>

        <main>{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
