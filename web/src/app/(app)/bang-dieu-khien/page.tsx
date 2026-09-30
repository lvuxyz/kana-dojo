"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge, Button, Card, Progress, Spinner, Stat } from "@/components/ui";
import { get } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { BadgeDto, HeatmapDay, ProgressSummaryDto, StatsDto } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const stats = useQuery({ queryKey: ["stats"], queryFn: () => get<StatsDto>("/stats/me") });
  const summary = useQuery({ queryKey: ["progress", "summary"], queryFn: () => get<ProgressSummaryDto>("/progress/summary") });
  const heat = useQuery({ queryKey: ["heatmap"], queryFn: () => get<HeatmapDay[]>("/stats/heatmap?days=112") });
  const badges = useQuery({ queryKey: ["badges"], queryFn: () => get<BadgeDto[]>("/badges") });

  if (stats.isLoading) return <Spinner label="Đang nạp dữ liệu rèn luyện" />;

  const s = stats.data;
  const sum = summary.data;
  const due = sum?.dueToday ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Lời chào đầu buổi học */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule/60 pb-4">
        <div>
          <h1 className="font-mincho text-2xl font-bold sm:text-3xl text-sumi">
            おかえり, <span className="text-shu">{user?.displayName}</span>
          </h1>
          <p className="mt-1 text-sm font-medium text-sumi-3">
            {due > 0
              ? `Hôm nay đạo trường có ${due} ký tự cần ôn tập. Hoàn thành để giữ vững chuỗi ngày rèn luyện.`
              : "Tất cả ký tự đều đã được ôn tập chu đáo. Hãy rèn thêm chữ mới hôm nay nhé!"}
          </p>
        </div>
        <Badge variant={due > 0 ? "shu" : "genko"}>
          {due > 0 ? `${due} thẻ đến hạn` : "Đã xong bài tập"}
        </Badge>
      </div>

      {/* Thẻ hành động trung tâm — Việc cần làm hôm nay */}
      <div className="glass-luxury relative overflow-hidden rounded-3xl border-2 border-shu/35 bg-gradient-to-r from-shu-tint/80 via-surface to-shu-tint/50 p-6 shadow-lg shadow-shu/10 sm:p-7">
        <span className="pointer-events-none absolute -right-4 -bottom-6 select-none font-mincho text-[120px] font-bold text-shu/[0.06] leading-none">
          稽
        </span>

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <span className="hanko-seal px-3 py-1.5 text-lg">
              今日
            </span>
            <div>
              <span className="label-xs text-shu-2">Phiên rèn luyện hôm nay</span>
              <p className="mt-0.5 font-mincho text-xl font-bold text-sumi sm:text-2xl">
                {due > 0 ? (
                  <>
                    Ôn tập <b className="tnum text-shu">{due}</b> ký tự đến hạn
                  </>
                ) : (
                  "Luyện nét chữ mới trong bảng Kana"
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {due > 0 && (
              <Link href="/on-tap">
                <Button variant="solid" size="lg" className="px-6 font-semibold shadow-md shadow-shu/25">
                  Bắt đầu ôn tập
                </Button>
              </Link>
            )}
            <Link href="/luyen-viet">
              <Button size="lg" variant={due > 0 ? "outline" : "solid"} className="font-semibold px-6">
                Vào phòng luyện viết
              </Button>
            </Link>
            <Link href="/luyen-go">
              <Button size="lg" variant="ghost" className="font-semibold px-5">
                Luyện gõ phím
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Bảng 4 số đo then chốt */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card variant="interactive" className="p-5.5">
          <Stat
            label="Chuỗi ngày rèn luyện"
            value={s?.currentStreak ?? 0}
            sub={`Kỷ lục dài nhất: ${s?.longestStreak ?? 0} ngày`}
            tone="shu"
          />
        </Card>
        <Card variant="interactive" className="p-5.5">
          <Stat
            label="Đẳng cấp Dōjō"
            value={`Cấp ${s?.level ?? 1}`}
            sub={`Còn ${s?.xpToNextLevel ?? 0} XP để thăng cấp`}
            tone="gold"
          />
        </Card>
        <Card variant="interactive" className="p-5.5">
          <Stat
            label="Kana đã tinh thông"
            value={sum?.kanaMastered ?? 0}
            sub={`Đã rèn qua ${sum?.kanaLearned ?? 0} ký tự`}
            tone="genko"
          />
        </Card>
        <Card variant="interactive" className="p-5.5">
          <Stat
            label="Tổng điểm tích luỹ"
            value={(s?.xpTotal ?? 0).toLocaleString("vi-VN")}
            sub="XP rèn luyện từ đầu"
          />
        </Card>
      </div>

      {/* Mục tiêu XP trong ngày */}
      <Card variant="glass" className="p-6">
        <div className="mb-2.5 flex items-baseline justify-between">
          <span className="label-xs">Mục tiêu điểm rèn luyện hôm nay</span>
          <span className="text-xs font-bold text-sumi tnum">
            {s?.todayXp ?? 0} / {s?.dailyGoalXp ?? 50} XP
          </span>
        </div>
        <Progress value={s?.todayXp ?? 0} max={s?.dailyGoalXp ?? 50} tone="shu" />
        <p className="mt-3 text-xs font-medium text-sumi-3">
          {s?.goalMet
            ? "🎉 Đã hoàn thành mục tiêu ngày hôm nay — chuỗi ngày kiên trì của bạn đã được ghi nhận vào sổ bộ!"
            : "Chuỗi ngày chỉ tăng khi bạn đạt mục tiêu XP bằng nét vẽ thực thụ, không phải chỉ mở ứng dụng."}
        </p>
      </Card>

      {/* Bản đồ nhiệt đóng dấu điểm danh */}
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between">
          <span className="label-xs">Sổ Điểm Danh 16 Tuần (稽古帳)</span>
          <span className="text-[11px] font-semibold text-sumi-3">
            Mỗi ô là một ngày rèn luyện
          </span>
        </div>
        <Heatmap days={heat.data ?? []} />
      </Card>

      {/* Bộ sưu tập huy hiệu danh dự */}
      {badges.data && badges.data.length > 0 && (
        <Card variant="glass" className="p-6">
          <span className="label-xs">Huy hiệu danh dự đạt được</span>
          <ul className="mt-4 flex flex-wrap gap-2.5">
            {badges.data.map((b) => (
              <li
                key={b.code}
                title={b.descriptionVi}
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${
                  b.earnedAt
                    ? "border-gold/50 bg-gold-tint/60 text-sumi shadow-xs ring-1 ring-gold/20"
                    : "border-rule/80 bg-surface-2 text-sumi-3 opacity-50"
                }`}
              >
                <span className="text-base" aria-hidden>{b.icon}</span>
                <span>{b.nameVi}</span>
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
    <div className="mt-4 overflow-x-auto pb-1">
      <div className="grid grid-flow-col grid-rows-7 gap-[4px]" style={{ width: "max-content" }}>
        {cells.map((c) => {
          const level = c.xp === 0 ? 0 : Math.min(4, Math.ceil((c.xp / max) * 4));
          return (
            <span
              key={c.date}
              title={`${c.date} · ${c.xp} XP`}
              className="h-3 w-3 rounded-[3px] transition-transform hover:scale-125 hover:z-10"
              style={{
                background: level === 0 ? "var(--rule)" : "var(--genko)",
                opacity: level === 0 ? 0.65 : 0.35 + level * 0.1625,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
