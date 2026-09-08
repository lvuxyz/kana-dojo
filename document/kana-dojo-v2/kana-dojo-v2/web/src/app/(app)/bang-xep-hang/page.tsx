"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Card, Empty, Spinner } from "@/components/ui";
import { get } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { LeaderboardDto } from "@/lib/types";

export default function LeaderboardPage() {
  const { user } = useAuth();
  const board = useQuery({ queryKey: ["leaderboard"], queryFn: () => get<LeaderboardDto>("/leaderboard/weekly?limit=50") });

  if (board.isLoading) return <Spinner />;
  if (board.isError) return <Empty title="Chưa tải được bảng xếp hạng" hint="Máy chủ đang không phản hồi." />;

  const d = board.data!;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-mincho text-2xl font-semibold">Bảng xếp hạng tuần</h1>
        <p className="mt-0.5 text-sm text-sumi-3">
          Tính từ thứ Hai {new Date(d.weekStart).toLocaleDateString("vi-VN")} theo giờ Việt Nam.
          {d.myRank && <> Bạn đang ở hạng <b className="text-shu">{d.myRank}</b>.</>}
        </p>
      </div>

      <Card className="divide-y divide-rule">
        {d.entries.length === 0 && <div className="px-5 py-10 text-center text-sm text-sumi-3">Tuần này chưa ai ghi điểm.</div>}
        {d.entries.map((e) => {
          const me = e.userId === user?.id;
          return (
            <div key={e.userId}
                 className={clsx("flex items-center gap-3.5 px-4 py-2.5", me && "bg-shu-tint/50")}>
              <span className={clsx("w-7 text-right font-mincho text-lg font-semibold tnum",
                e.rank === 1 ? "text-gold" : e.rank <= 3 ? "text-shu" : "text-sumi-3")}>
                {e.rank}
              </span>
              <span className="grid h-8 w-8 flex-none place-items-center overflow-hidden rounded-full bg-paper-sunk text-[13px] font-semibold text-sumi-2">
                {e.avatarUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={e.avatarUrl} alt="" className="h-full w-full object-cover" />
                  : e.displayName.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">
                {e.displayName}{me && <span className="ml-1.5 text-[11px] text-shu">bạn</span>}
              </span>
              <span className="text-sm font-semibold tnum">{e.xp.toLocaleString("vi-VN")}<span className="ml-1 text-[11px] font-normal text-sumi-3">XP</span></span>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
