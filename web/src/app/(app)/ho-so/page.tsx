"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Field, Seg, Spinner, Stat } from "@/components/ui";
import { get, patch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { StatsDto, UserDto } from "@/lib/types";

// CHẾ ĐỘ CÁ NHÂN (tạm thời) — xem docs/LOCAL_MODE.md: không có gói cước nên không có hạn mức theo gói.
// [máy chủ — đang tắt] interface Entitlements {
// [máy chủ — đang tắt]   plan: "FREE" | "PRO";
// [máy chủ — đang tắt]   features: Record<string, number | null>;
// [máy chủ — đang tắt]   usage: Record<string, number>;
// [máy chủ — đang tắt] }
// [máy chủ — đang tắt]
// [máy chủ — đang tắt] const FEATURE_LABEL: Record<string, string> = {
// [máy chủ — đang tắt]   "srs.daily_reviews": "Lượt ôn mỗi ngày",
// [máy chủ — đang tắt]   "writing.daily_attempts": "Lượt tập viết mỗi ngày",
// [máy chủ — đang tắt]   "content.jlpt_levels": "Cấp độ JLPT mở khoá",
// [máy chủ — đang tắt]   "stats.history_days": "Lịch sử thống kê (ngày)",
// [máy chủ — đang tắt] };

export default function ProfilePage() {
  // [máy chủ — đang tắt] const { user, logout } = useAuth();
  const { user, reloadUser, resetData } = useAuth();
  const qc = useQueryClient();
  const [goal, setGoal] = useState(String(user?.dailyGoalXp ?? 50));

  const stats = useQuery({ queryKey: ["stats"], queryFn: () => get<StatsDto>("/stats/me") });
  // [máy chủ — đang tắt] const ent = useQuery({ queryKey: ["entitlements"], queryFn: () => get<Entitlements>("/me/entitlements") });

  const save = useMutation({
    mutationFn: (body: Partial<UserDto>) => patch<UserDto>("/auth/me", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stats"] });
      // Hồ sơ nằm trong context: nạp lại để múi giờ/mục tiêu mới hiện ngay, không cần tải lại trang.
      reloadUser();
    },
  });

  if (!user) return <Spinner />;

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <h1 className="font-mincho text-2xl font-semibold">Hồ sơ</h1>

      <Card className="flex flex-wrap items-center gap-4 px-5 py-4">
        <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-paper-sunk font-mincho text-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : user.displayName.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mincho text-lg">{user.displayName}</p>
          {/* [máy chủ — đang tắt] <p className="text-[13px] text-sumi-3">{user.email}</p> */}
          <p className="text-[13px] text-sumi-3">Tiến độ chỉ lưu trên trình duyệt này</p>
        </div>
        {/* [máy chủ — đang tắt]
        <span className={`rounded-full px-3 py-1 text-[12px] font-medium ${
          user.plan === "PRO" ? "bg-shu text-white" : "border border-rule text-sumi-2"}`}>
          {user.plan === "PRO" ? "PRO" : "Miễn phí"}
        </span> */}
        <span className="rounded-full border border-rule px-3 py-1 text-[12px] font-medium text-sumi-2">Cá nhân</span>
      </Card>

      <Card className="grid grid-cols-3 gap-4 px-5 py-4">
        <Stat label="Chuỗi dài nhất" value={stats.data?.longestStreak ?? 0} tone="shu" />
        <Stat label="Cấp độ" value={stats.data?.level ?? 1} tone="gold" />
        <Stat label="Bùa giữ chuỗi" value={stats.data?.streakFreezes ?? 0} sub="hồi lại mỗi thứ Hai" tone="genko" />
      </Card>

      <Card className="flex flex-col gap-4 px-5 py-4">
        <span className="label-xs">Cài đặt học tập</span>

        <Field
          label="Mục tiêu XP mỗi ngày"
          type="number" min={10} max={500} step={10}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
        <p className="-mt-2 text-[11.5px] text-sumi-3">
          Chuỗi ngày chỉ tăng khi bạn đạt mốc này. Đặt thấp và đạt đều đặn tốt hơn đặt cao rồi bỏ.
        </p>

        <div>
          <span className="label-xs">Giao diện</span>
          <Seg
            className="mt-1.5"
            value={user.timezone === "Asia/Ho_Chi_Minh" ? "vn" : "other"}
            onChange={(v) => save.mutate({ timezone: v === "vn" ? "Asia/Ho_Chi_Minh" : Intl.DateTimeFormat().resolvedOptions().timeZone })}
            options={[
              { value: "vn", label: "Giờ Việt Nam" },
              { value: "other", label: `Giờ máy (${Intl.DateTimeFormat().resolvedOptions().timeZone})` },
            ]}
          />
          <p className="mt-1.5 text-[11.5px] text-sumi-3">
            Múi giờ quyết định lúc nào là &ldquo;ngày mới&rdquo; khi tính chuỗi ngày học.
          </p>
        </div>

        <Button
          variant="solid"
          disabled={save.isPending}
          onClick={() => save.mutate({ dailyGoalXp: Number(goal) })}
          className="self-start"
        >
          {save.isPending ? "Đang lưu…" : "Lưu thay đổi"}
        </Button>
      </Card>

      {/* [máy chủ — đang tắt]
      {ent.data && (
        <Card className="flex flex-col gap-3 px-5 py-4">
          <span className="label-xs">Hạn mức gói {ent.data.plan === "PRO" ? "PRO" : "miễn phí"}</span>
          <ul className="flex flex-col gap-2">
            {Object.entries(ent.data.features).map(([k, limit]) => (
              <li key={k} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="text-sumi-2">{FEATURE_LABEL[k] ?? k}</span>
                <span className="tnum text-sumi-3">
                  {limit == null ? "không giới hạn" : `${ent.data!.usage[k] ?? 0} / ${limit}`}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      */}

      {/* [máy chủ — đang tắt] <Button variant="ghost" onClick={logout} className="self-start">Đăng xuất</Button> */}
      <Card className="flex flex-col gap-3 px-5 py-4">
        <span className="label-xs">Dữ liệu trên máy này</span>
        <p className="text-[12.5px] leading-relaxed text-sumi-3">
          Tiến độ, điểm và lịch ôn được lưu ngay trong trình duyệt, không cần tài khoản. Xoá dữ liệu trình duyệt hoặc
          dùng máy khác thì sẽ mất tiến độ.
        </p>
        <Button
          variant="ghost"
          className="self-start"
          onClick={() => {
            if (window.confirm("Xoá toàn bộ tiến độ học trên máy này? Không thể hoàn tác.")) resetData();
          }}
        >
          Xoá toàn bộ dữ liệu
        </Button>
      </Card>
    </div>
  );
}
