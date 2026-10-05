"use client";

import { useMemo } from "react";
import Link from "next/link";
import { RichText } from "@/components/library/RichText";
import { Badge, Button, Card, Progress, Spinner, Stat } from "@/components/ui";
import { useBadges, useHeatmap, useLearnContext, useProgress, useStats, useSummary } from "@/lib/learning/hooks";
import { buildQueue } from "@/lib/learning/reviews";
import { systemClock } from "@/lib/learning/time";
import { sortNotes } from "@/lib/space/library";
import { previewOf } from "@/lib/space/markup";
import { useSpace } from "@/lib/space/hooks";
import type { ModuleId, Space, WidgetId } from "@/lib/space/space";
import type { HeatmapDay, StatsView, ProgressSummary } from "@/lib/types";

const HEATMAP_DAYS = 112;

interface Today {
  due: number;
  fresh: number;
}

export default function DashboardPage() {
  const { stats: s, ready } = useStats();
  const { summary: sum } = useSummary();
  const { days } = useHeatmap(HEATMAP_DAYS);
  const { badges } = useBadges();
  const { state } = useProgress();
  const ctx = useLearnContext();
  const { space } = useSpace();

  // Thẻ mới còn học được hôm nay theo đúng cách học người dùng đã chọn (hạn mức, nguồn thẻ).
  const fresh = useMemo(
    () => buildQueue(state, { limit: ctx.study.sessionSize }, systemClock(), ctx).newCount,
    [state, ctx],
  );

  if (!ready) return <Spinner label="Đang nạp dữ liệu rèn luyện" />;

  const today: Today = { due: sum.dueToday, fresh };
  const name = space.profile.name;

  const render: Record<WidgetId, React.ReactNode> = {
    today: <TodayCard space={space} today={today} />,
    stats: <StatGrid s={s} sum={sum} />,
    goal: <GoalCard s={s} />,
    heatmap: <HeatmapCard days={days} />,
    badges: (
      <Card variant="glass" className="p-6">
        <span className="label-xs">Huy hiệu danh dự đạt được</span>
        <ul className="mt-4 flex flex-wrap gap-2.5">
          {badges.map((b) => (
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
    ),
    notes: <PinnedNotes space={space} />,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Lời chào đầu buổi học */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule/60 pb-4">
        <div className="min-w-0">
          <h1 className="font-mincho text-2xl font-bold sm:text-3xl text-sumi">
            おかえり{name ? `、${name}さん` : ""}<span className="text-shu">！</span>
          </h1>
          {space.profile.goal && (
            <p className="mt-1.5 max-w-xl text-sm font-semibold italic text-sumi-2">“{space.profile.goal}”</p>
          )}
          <p className="mt-1 text-sm font-medium text-sumi-3">{greeting(today)}</p>
        </div>
        <Badge variant={today.due > 0 ? "shu" : "genko"}>
          {today.due > 0 ? `${today.due} thẻ đến hạn` : "Không có thẻ đến hạn"}
        </Badge>
      </div>

      {space.home.widgets.length === 0 && (
        <Card className="px-5 py-4 text-sm text-sumi-3">
          Trang Tổng quan của bạn đang để trống. Chọn các khối muốn hiện ở{" "}
          <Link href="/cai-dat?tab=tools" className="underline">Cài đặt › Công cụ</Link>.
        </Card>
      )}

      {space.home.widgets.map((id) => (
        <div key={id}>{render[id]}</div>
      ))}
    </div>
  );
}

function greeting({ due, fresh }: Today): string {
  if (due > 0) return `Hôm nay có ${due} thẻ cần ôn. Hoàn thành để giữ vững chuỗi ngày rèn luyện.`;
  if (fresh > 0) return `Không có thẻ nào đến hạn. Bạn có thể học thêm ${fresh} thẻ mới hôm nay.`;
  return "Hôm nay không còn thẻ nào chờ bạn. Học thêm, soạn thẻ mới hoặc viết ghi chú nhé.";
}

// ------------------------------------------------------------------ các khối

/** Việc nên làm hôm nay — chỉ đưa ra lối vào những công cụ người học đang bật. */
function TodayCard({ space, today }: { space: Space; today: Today }) {
  const has = (m: ModuleId) => space.modules.includes(m);
  const { due, fresh } = today;
  const headline =
    due > 0 ? (
      <>Ôn tập <b className="tnum text-shu">{due}</b> thẻ đến hạn</>
    ) : fresh > 0 ? (
      <>Học <b className="tnum text-shu">{fresh}</b> thẻ mới</>
    ) : (
      "Hôm nay bạn muốn làm gì?"
    );
  const reviewLabel = due > 0 ? "Bắt đầu ôn tập" : "Học thẻ mới";
  const candidates = [
    has("review") && (due > 0 || fresh > 0) && { href: "/on-tap", label: reviewLabel },
    has("writing") && { href: "/luyen-viet", label: "Vào phòng luyện viết" },
    has("typing") && { href: "/luyen-go", label: "Luyện gõ phím" },
    has("library") && { href: "/thu-vien", label: "Thư viện của tôi" },
  ].filter((a): a is { href: string; label: string } => !!a);
  // Luôn có một nút chính (lối vào đầu tiên), một nút phụ, còn lại mờ — dù người học đã tắt công cụ nào.
  const variants = ["solid", "outline", "ghost", "ghost"] as const;
  const actions = candidates.map((a, i) => ({ ...a, variant: variants[i] }));

  return (
    <div className="glass-luxury relative overflow-hidden rounded-3xl border-2 border-shu/35 bg-gradient-to-r from-shu-tint/80 via-surface to-shu-tint/50 p-6 shadow-lg shadow-shu/10 sm:p-7">
      <span className="pointer-events-none absolute -right-4 -bottom-6 select-none font-mincho text-[120px] font-bold text-shu/[0.06] leading-none">
        稽
      </span>

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <span className="hanko-seal px-3 py-1.5 text-lg">今日</span>
          <div>
            <span className="label-xs text-shu-2">Phiên rèn luyện hôm nay</span>
            <p className="mt-0.5 font-mincho text-xl font-bold text-sumi sm:text-2xl">{headline}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {actions.map((a) => (
            <Link key={a.href} href={a.href}>
              <Button size="lg" variant={a.variant} className={a.variant === "solid" ? "px-6 font-semibold shadow-md shadow-shu/25" : "font-semibold px-5"}>
                {a.label}
              </Button>
            </Link>
          ))}
          {actions.length === 0 && (
            <Link href="/cai-dat?tab=tools" className="text-sm text-sumi-3 underline">Bật thêm công cụ ở Cài đặt</Link>
          )}
        </div>
      </div>
    </div>
  );
}

function StatGrid({ s, sum }: { s: StatsView; sum: ProgressSummary }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card variant="interactive" className="p-5.5">
        <Stat label="Chuỗi ngày rèn luyện" value={s.currentStreak} sub={`Kỷ lục dài nhất: ${s.longestStreak} ngày`} tone="shu" />
      </Card>
      <Card variant="interactive" className="p-5.5">
        <Stat label="Đẳng cấp Dōjō" value={`Cấp ${s.level}`} sub={`Còn ${s.xpToNextLevel} XP để thăng cấp`} tone="gold" />
      </Card>
      <Card variant="interactive" className="p-5.5">
        <Stat label="Kana đã tinh thông" value={sum.kanaMastered} sub={`Đã rèn qua ${sum.kanaLearned} ký tự`} tone="genko" />
      </Card>
      <Card variant="interactive" className="p-5.5">
        <Stat label="Tổng điểm tích luỹ" value={s.xpTotal.toLocaleString("vi-VN")} sub="XP rèn luyện từ đầu" />
      </Card>
    </div>
  );
}

function GoalCard({ s }: { s: StatsView }) {
  return (
    <Card variant="glass" className="p-6">
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="label-xs">Mục tiêu điểm rèn luyện hôm nay</span>
        <span className="text-xs font-bold text-sumi tnum">{s.todayXp} / {s.dailyGoalXp} XP</span>
      </div>
      <Progress value={s.todayXp} max={s.dailyGoalXp} tone="shu" />
      <p className="mt-3 text-xs font-medium text-sumi-3">
        {s.goalMet
          ? "🎉 Đã hoàn thành mục tiêu ngày hôm nay — chuỗi ngày kiên trì của bạn đã được ghi nhận vào sổ bộ!"
          : "Chuỗi ngày chỉ tăng khi bạn đạt mục tiêu XP bằng việc học thực sự, không phải chỉ mở ứng dụng."}
      </p>
    </Card>
  );
}

/** Ghi chú người học đã ghim — bấm để mở thẳng trong Thư viện; ghi chú ngắn thì đọc luôn tại chỗ. */
function PinnedNotes({ space }: { space: Space }) {
  const pinned = sortNotes(space.library.notes).filter((n) => n.pinned);
  return (
    <Card variant="glass" className="p-6">
      <div className="flex items-baseline justify-between gap-3">
        <span className="label-xs">Ghi chú đã ghim</span>
        <Link href="/thu-vien?tab=notes" className="text-[12px] font-semibold text-sumi-3 underline">Mở thư viện</Link>
      </div>
      {pinned.length === 0 ? (
        <p className="mt-3 text-sm text-sumi-3">
          Chưa có ghi chú nào được ghim. Ghim ghi chú bạn cần xem hằng ngày (bảng chia động từ, mẹo nhớ…) để nó hiện ở đây.
        </p>
      ) : (
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {pinned.slice(0, 4).map((n) => (
            <li key={n.id}>
              <Link
                href={`/thu-vien?tab=notes&note=${n.id}`}
                className="flex h-full flex-col gap-1.5 rounded-xl border border-rule/80 bg-surface px-4 py-3 transition-colors hover:border-rule-firm hover:bg-surface-2"
              >
                <span className="truncate text-sm font-bold text-sumi">📌 {n.title || "Không có tiêu đề"}</span>
                {n.body.length <= 240 ? (
                  <RichText source={n.body} className="flex flex-col gap-1 text-[13px] leading-[1.8] text-sumi-2" />
                ) : (
                  <span className="line-clamp-3 text-[13px] text-sumi-3">{previewOf(n.body, 200)}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Lưới nhiệt kiểu bảng đóng dấu điểm danh — mỗi cột một tuần, đọc từ trái sang. */
function HeatmapCard({ days }: { days: HeatmapDay[] }) {
  const max = Math.max(50, ...days.map((d) => d.xp));

  return (
    <Card variant="glass" className="p-6">
      <div className="flex items-center justify-between">
        <span className="label-xs">Sổ Điểm Danh 16 Tuần (稽古帳)</span>
        <span className="text-[11px] font-semibold text-sumi-3">Mỗi ô là một ngày rèn luyện</span>
      </div>
      <div className="mt-4 overflow-x-auto pb-1">
        <div className="grid grid-flow-col grid-rows-7 gap-[4px]" style={{ width: "max-content" }}>
          {days.map((d) => {
            const level = d.xp === 0 ? 0 : Math.min(4, Math.ceil((d.xp / max) * 4));
            return (
              <span
                key={d.date}
                title={`${d.date} · ${d.xp} XP`}
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
    </Card>
  );
}
