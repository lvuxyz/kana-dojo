"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Progress, Spinner, Stat } from "@/components/ui";
import { get } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { BadgeDto, HeatmapDay, ProgressSummaryDto, StatsDto } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const stats = useQuery({ queryKey: ["stats"], queryFn: () => get<StatsDto>("/stats/me") });
  const summary = useQuery({ queryKey: ["progress", "summary"], queryFn: () => get<ProgressSummaryDto>("/progress/summary") });
  const heat = useQuery({ queryKey: ["heatmap"], queryFn: () => get<HeatmapDay[]>("/stats/heatmap?days=112") });
  const badges = useQuery({ queryKey: ["badges"], queryFn: () => get<BadgeDto[]>("/badges") });

  if (stats.isLoading) return <Spinner />;

  const s = stats.data;
  const sum = summary.data;
  const due = sum?.dueToday ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-mincho text-2xl font-semibold">おかえり, {user?.displayName}</h1>
        <p className="mt-0.5 text-sm text-sumi-3">
          {due > 0
            ? `Hôm nay có ${due} thẻ đến hạn ôn. Làm hết chúng là giữ được chuỗi ngày.`
            : "Không còn thẻ đến hạn. Học thêm ký tự mới để mở rộng vốn nhé."}
        </p>
      </div>

      {/* Việc cần làm hôm nay đứng trước mọi con số thống kê */}
      <Card className="flex flex-wrap items-center gap-4 border-shu/30 bg-shu-tint/40 px-5 py-4">
        <div className="min-w-0 flex-1">
          <span className="label-xs">Phiên hôm nay</span>
          <p className="mt-0.5 font-mincho text-lg">
            {due > 0 ? <>Ôn <b className="tnum text-shu">{due}</b> thẻ đến hạn</> : "Học ký tự mới"}
          </p>
        </div>
        <div className="flex gap-2">
          {due > 0 && <Link href="/on-tap"><Button variant="solid" size="lg">Bắt đầu ôn</Button></Link>}
          <Link href="/luyen-viet"><Button size="lg" variant={due > 0 ? "outline" : "solid"}>Luyện viết</Button></Link>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="px-5 py-4"><Stat label="Chuỗi ngày" value={s?.currentStreak ?? 0} sub={`Dài nhất ${s?.longestStreak ?? 0} ngày`} tone="shu" /></Card>
        <Card className="px-5 py-4"><Stat label="Cấp độ" value={s?.level ?? 1} sub={`Còn ${s?.xpToNextLevel ?? 0} XP lên cấp`} tone="gold" /></Card>
        <Card className="px-5 py-4"><Stat label="Kana đã thuộc" value={sum?.kanaMastered ?? 0} sub={`${sum?.kanaLearned ?? 0} đã học qua`} tone="genko" /></Card>
        <Card className="px-5 py-4"><Stat label="Tổng XP" value={(s?.xpTotal ?? 0).toLocaleString("vi-VN")} sub="từ khi bắt đầu" /></Card>
      </div>

      <Card className="px-5 py-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="label-xs">Mục tiêu hôm nay</span>
          <span className="text-xs text-sumi-2 tnum">{s?.todayXp ?? 0}/{s?.dailyGoalXp ?? 50} XP</span>
        </div>
        <Progress value={s?.todayXp ?? 0} max={s?.dailyGoalXp ?? 50} />
        <p className="mt-2 text-xs text-sumi-3">
          {s?.goalMet
            ? "Đã đạt mục tiêu — chuỗi ngày của bạn được tính rồi."
            : "Chuỗi ngày chỉ tăng khi bạn đạt mục tiêu XP, không phải chỉ mở ứng dụng."}
        </p>
      </Card>

      <Card className="px-5 py-4">
        <span className="label-xs">16 tuần gần nhất</span>
        <Heatmap days={heat.data ?? []} />
      </Card>

      {badges.data && badges.data.length > 0 && (
        <Card className="px-5 py-4">
          <span className="label-xs">Huy hiệu</span>
          <ul className="mt-3 flex flex-wrap gap-2">
            {badges.data.map((b) => (
              <li key={b.code}
                  title={b.descriptionVi}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] ${
                    b.earnedAt ? "border-gold/40 bg-surface-2 text-sumi" : "border-rule text-sumi-3 opacity-55"
                  }`}>
                <span aria-hidden>{b.icon}</span>{b.nameVi}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/** Lưới nhiệt kiểu bảng đóng dấu điểm danh — mỗi cột một tuần, đọc từ trái sang. */
function Heatmap({ days }: { days: HeatmapDay[] }) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const cells: { date: string; xp: number }[] = [];
  const today = new Date();
  for (let i = 111; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, xp: byDate.get(key)?.xp ?? 0 });
  }
  const max = Math.max(50, ...cells.map((c) => c.xp));

  return (
    <div className="mt-3 overflow-x-auto">
      <div className="grid grid-flow-col grid-rows-7 gap-[3px]" style={{ width: "max-content" }}>
        {cells.map((c) => {
          const level = c.xp === 0 ? 0 : Math.min(4, Math.ceil((c.xp / max) * 4));
          return (
            <span
              key={c.date}
              title={`${c.date} · ${c.xp} XP`}
              className="h-3 w-3 rounded-[2px]"
              style={{
                background: level === 0 ? "var(--rule)" : "var(--genko)",
                opacity: level === 0 ? 1 : 0.25 + level * 0.1875,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
