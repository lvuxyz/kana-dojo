"use client";

import { useRef, useState } from "react";
import { InstallCard } from "@/components/app/InstallCard";
import { Button, Card, Field, Spinner, Stat } from "@/components/ui";
import { useStats } from "@/lib/learning/hooks";
import { MAX_DAILY_GOAL_XP, MIN_DAILY_GOAL_XP } from "@/lib/learning/state";
import { exportProgress, importProgress, resetProgress, setDailyGoal } from "@/lib/learning/store";
import { dayKey, systemClock } from "@/lib/learning/time";

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

type Notice = { tone: "ok" | "err"; text: string };

export default function SettingsPage() {
  const { stats, ready } = useStats();
  // null = chưa chỉnh: ô nhập hiện mục tiêu đang lưu. Tách riêng để không phải đồng bộ state trong effect.
  const [goal, setGoal] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  if (!ready) return <Spinner />;

  const goalValue = goal ?? String(stats.dailyGoalXp);

  const saveGoal = () => {
    setDailyGoal(Number(goalValue));
    setGoal(null);
    setNotice({ tone: "ok", text: "Đã lưu mục tiêu mới." });
  };

  const download = () => {
    const { now, zone } = systemClock();
    const url = URL.createObjectURL(new Blob([exportProgress()], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `kana-dojo-tien-do-${dayKey(now, zone)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice({ tone: "ok", text: "Đã tải tiến độ về máy. Hãy cất tệp này ở nơi an toàn." });
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES) {
        setNotice({ tone: "err", text: "Tệp quá lớn — đây không phải tệp tiến độ của Kana Dōjō." });
        return;
      }
      const text = await file.text();
      if (!window.confirm("Thay toàn bộ tiến độ hiện tại bằng nội dung của tệp này?")) return;
      const res = importProgress(text);
      setGoal(null);
      setNotice(res.ok ? { tone: "ok", text: "Đã khôi phục tiến độ từ tệp." } : { tone: "err", text: res.error });
    } finally {
      if (fileInput.current) fileInput.current.value = ""; // cho phép chọn lại đúng tệp đó lần nữa
    }
  };

  const reset = () => {
    if (!window.confirm("Xoá toàn bộ tiến độ, chuỗi ngày và huy hiệu trên trình duyệt này? Không thể hoàn tác.")) return;
    resetProgress();
    setGoal(null);
    setNotice({ tone: "ok", text: "Đã xoá toàn bộ tiến độ." });
  };

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <h1 className="font-mincho text-2xl font-semibold">Cài đặt</h1>

      <Card className="flex flex-col gap-2 px-5 py-4">
        <span className="label-xs">Không cần tài khoản</span>
        <p className="text-[13px] leading-relaxed text-sumi-2">
          Kana Dōjō là trang công khai: ai cũng học được ngay, không đăng ký, không đăng nhập. Tiến độ của bạn được lưu
          <b> ngay trong trình duyệt này</b> và không bao giờ rời khỏi máy. Đổi lại, nó không tự đồng bộ sang thiết bị khác
          và sẽ mất nếu bạn xoá dữ liệu trang web — hãy tải tiến độ về định kỳ ở mục bên dưới.
        </p>
      </Card>

      <InstallCard />

      <Card className="grid grid-cols-3 gap-4 px-5 py-4">
        <Stat label="Chuỗi dài nhất" value={stats.longestStreak} tone="shu" />
        <Stat label="Cấp độ" value={stats.level} tone="gold" />
        <Stat label="Bùa giữ chuỗi" value={stats.streakFreezes} sub="hồi lại mỗi thứ Hai" tone="genko" />
      </Card>

      <Card className="flex flex-col gap-4 px-5 py-4">
        <span className="label-xs">Cài đặt học tập</span>

        <Field
          label="Mục tiêu XP mỗi ngày"
          type="number" min={MIN_DAILY_GOAL_XP} max={MAX_DAILY_GOAL_XP} step={10}
          value={goalValue}
          onChange={(e) => setGoal(e.target.value)}
        />
        <p className="-mt-2 text-[11.5px] text-sumi-3">
          Chuỗi ngày chỉ tăng khi bạn đạt mốc này. Đặt thấp và đạt đều đặn tốt hơn đặt cao rồi bỏ.
          Ngày mới được tính theo giờ trên thiết bị của bạn.
        </p>

        <Button variant="solid" disabled={goal === null || goal === String(stats.dailyGoalXp)} onClick={saveGoal} className="self-start">
          Lưu thay đổi
        </Button>
      </Card>

      <Card className="flex flex-col gap-4 px-5 py-4">
        <span className="label-xs">Sao lưu & khôi phục tiến độ</span>
        <p className="text-[12.5px] leading-relaxed text-sumi-3">
          Tệp sao lưu là một tệp JSON thường. Dùng nó để chuyển tiến độ sang máy khác hoặc phòng khi lỡ xoá dữ liệu trình duyệt.
        </p>

        <div className="flex flex-wrap gap-2.5">
          <Button variant="solid" onClick={download}>Tải tiến độ về máy</Button>
          <Button onClick={() => fileInput.current?.click()}>Khôi phục từ tệp…</Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void upload(e.target.files?.[0])}
          />
        </div>

        {notice && (
          <p
            role="status"
            className={`rounded-xl border px-3.5 py-2.5 text-[13px] font-semibold ${
              notice.tone === "ok" ? "border-genko/30 bg-genko-tint text-genko" : "border-shu/30 bg-shu-tint text-shu-2"
            }`}
          >
            {notice.text}
          </p>
        )}
      </Card>

      <Card className="flex flex-col gap-3 px-5 py-4">
        <span className="label-xs">Xoá dữ liệu</span>
        <p className="text-[12.5px] leading-relaxed text-sumi-3">
          Bắt đầu lại từ đầu trên trình duyệt này. Nên tải tiến độ về máy trước.
        </p>
        <Button variant="ghost" onClick={reset} className="self-start text-shu hover:text-shu-2">Xoá toàn bộ tiến độ</Button>
      </Card>
    </div>
  );
}
