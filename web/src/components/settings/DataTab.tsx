"use client";

import { useRef, useState } from "react";
import { InstallCard } from "@/components/app/InstallCard";
import { Button, Card, Notice } from "@/components/ui";
import { exportBackup, importBackup, parseBackup, resetEverything, resetLearning } from "@/lib/backup";
import { downloadText } from "@/lib/download";
import { dayKey, systemClock } from "@/lib/learning/time";
import { useSpace } from "@/lib/space/hooks";

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

type Msg = { tone: "ok" | "err"; text: string };

export function DataTab() {
  const { space } = useSpace();
  const [notice, setNotice] = useState<Msg | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const { notes, decks, texts } = space.library;
  const cards = decks.reduce((n, d) => n + d.cards.length, 0);
  const kb = Math.max(1, Math.round(JSON.stringify(space).length / 1024));

  const download = () => {
    const { now, zone } = systemClock();
    downloadText(`kana-dojo-sao-luu-${dayKey(now, zone)}.json`, exportBackup(), "application/json");
    setNotice({ tone: "ok", text: "Đã tải bản sao lưu về máy. Hãy cất tệp này ở nơi an toàn." });
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES) return setNotice({ tone: "err", text: "Tệp quá lớn — đây không phải tệp sao lưu của Kana Dōjo." });
      const text = await file.text();
      const parsed = parseBackup(text);
      if (!parsed.ok) return setNotice({ tone: "err", text: parsed.error });
      const what = parsed.kind === "full"
        ? "toàn bộ tiến độ, ghi chú, bộ thẻ, câu luyện gõ và cài đặt không gian"
        : "tiến độ học (tệp này là bản sao lưu cũ, chỉ có tiến độ — ghi chú và bộ thẻ hiện có được giữ nguyên)";
      if (!window.confirm(`Thay ${what} hiện tại bằng nội dung của tệp này?`)) return;
      const res = importBackup(text);
      setNotice(res.ok ? { tone: "ok", text: "Đã khôi phục từ tệp." } : { tone: "err", text: res.error });
    } finally {
      if (fileInput.current) fileInput.current.value = ""; // cho phép chọn lại đúng tệp đó lần nữa
    }
  };

  const clearLearning = () => {
    if (!window.confirm("Xoá tiến độ học, chuỗi ngày, huy hiệu và kỷ lục luyện gõ? Ghi chú, bộ thẻ và cài đặt của bạn được GIỮ. Không thể hoàn tác.")) return;
    resetLearning();
    setNotice({ tone: "ok", text: "Đã xoá việc học. Tài liệu và cài đặt của bạn vẫn còn." });
  };

  const clearAll = () => {
    if (!window.confirm("Xoá SẠCH mọi thứ trên trình duyệt này: tiến độ, ghi chú, bộ thẻ, câu luyện gõ và cài đặt? Không thể hoàn tác.")) return;
    resetEverything();
  };

  return (
    <div className="flex flex-col gap-5">
      <InstallCard />

      <Card className="flex flex-col gap-4 px-5 py-4">
        <span className="label-xs">Sao lưu & khôi phục</span>
        <p className="text-[12.5px] leading-relaxed text-sumi-3">
          Một tệp JSON thường chứa tiến độ học <b>và</b> không gian riêng của bạn (ghi chú, bộ thẻ, câu luyện gõ, công cụ, cách học).
          Dùng nó để chuyển sang máy khác hoặc phòng khi lỡ xoá dữ liệu trình duyệt. Kỷ lục luyện gõ lưu riêng trên máy này và chưa nằm trong tệp.
        </p>
        <p className="text-[12px] text-sumi-3 tnum">
          Hiện có: {notes.length} ghi chú · {decks.length} bộ thẻ ({cards} thẻ) · {texts.length} câu luyện gõ · không gian riêng chiếm khoảng {kb} KB
        </p>

        <div className="flex flex-wrap gap-2.5">
          <Button variant="solid" onClick={download}>Tải bản sao lưu về máy</Button>
          <Button onClick={() => fileInput.current?.click()}>Khôi phục từ tệp…</Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void upload(e.target.files?.[0])}
          />
        </div>

        {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      </Card>

      <Card className="flex flex-col gap-3 px-5 py-4">
        <span className="label-xs">Xoá dữ liệu</span>
        <p className="text-[12.5px] leading-relaxed text-sumi-3">Nên tải bản sao lưu về máy trước.</p>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="outline" onClick={clearLearning}>Xoá việc học, giữ tài liệu của tôi</Button>
          <Button variant="ghost" onClick={clearAll} className="text-shu hover:text-shu-2">Xoá sạch mọi thứ</Button>
        </div>
      </Card>
    </div>
  );
}
