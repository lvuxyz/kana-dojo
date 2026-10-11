"use client";

import { useEffect, useRef, useState } from "react";
import { InstallCard } from "@/components/app/InstallCard";
import { Button, Card, Notice } from "@/components/ui";
import { importBackup, parseBackup, resetEverything, resetLearning } from "@/lib/backup";
import { downloadBackup } from "@/components/app/download";
import {
  LOCAL_STORAGE_BUDGET, localDataBytes, markBackedUp, readStorageStatus, requestPersistence, type StorageStatus,
} from "@/lib/device";
import { useDevice } from "@/lib/device-hooks";
import { DAY_MS } from "@/lib/learning/time";
import { useSpace } from "@/lib/space/hooks";
import { LIMITS, spaceChars } from "@/lib/space/space";

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

type Msg = { tone: "ok" | "err"; text: string };

export function DataTab() {
  const { space } = useSpace();
  const [notice, setNotice] = useState<Msg | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const { notes, decks, texts } = space.library;
  const cards = decks.reduce((n, d) => n + d.cards.length, 0);
  const used = spaceChars(space);
  const pct = Math.max(1, Math.round((used / LIMITS.totalChars) * 100));

  const { lastBackupAt } = useDevice();

  const download = () => {
    downloadBackup();
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
      if (res.ok) markBackedUp(); // dữ liệu trên máy giờ đúng bằng một tệp đang có
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
          Hiện có: {notes.length} ghi chú · {decks.length} bộ thẻ ({cards} thẻ) · {texts.length} câu luyện gõ · đã dùng {pct}% dung lượng cho phép của không gian riêng
        </p>

        <p className="text-[12px] text-sumi-3">{backupAge(lastBackupAt)}</p>

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

      <StorageCard />

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

function backupAge(at: number | null): string {
  if (at === null) return "Chưa tải bản sao lưu nào trên máy này.";
  const days = Math.floor((Date.now() - at) / DAY_MS);
  const when = days <= 0 ? "hôm nay" : days === 1 ? "hôm qua" : `${days} ngày trước`;
  return `Lần sao lưu gần nhất trên máy này: ${new Date(at).toLocaleDateString("vi-VN")} (${when}).`;
}

function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** Trình duyệt có hứa giữ dữ liệu của trang không, và dữ liệu đang chiếm bao nhiêu. */
function StorageCard() {
  // null = đang đọc (navigator.storage là bất đồng bộ) → chưa vẽ gì để khỏi nháy.
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [local, setLocal] = useState<number | null>(null);
  const [asked, setAsked] = useState(false);

  useEffect(() => {
    let alive = true;
    void readStorageStatus().then((s) => { if (alive) setStatus(s); });
    setLocal(localDataBytes());
    return () => { alive = false; };
  }, []);

  const ask = async () => {
    const protection = await requestPersistence();
    setAsked(true);
    setStatus((s) => (s ? { ...s, protection } : s));
  };

  if (status === null) return null;

  return (
    <Card className="flex flex-col gap-3 px-5 py-4">
      <span className="label-xs">Lưu trữ trên máy này</span>

      {status.protection === "persisted" ? (
        <p className="text-[13px] leading-relaxed text-sumi-2">
          <b className="text-genko">Đã được bảo vệ.</b> Trình duyệt hứa không tự dọn dữ liệu của Kana Dōjō khi máy thiếu chỗ.
          Bạn vẫn có thể tự xoá nó (xoá dữ liệu trang web), nên bản sao lưu vẫn nên có.
        </p>
      ) : status.protection === "best-effort" ? (
        <>
          <p className="text-[13px] leading-relaxed text-sumi-2">
            <b>Chưa được bảo vệ.</b> Khi máy thiếu chỗ, trình duyệt có thể tự dọn dữ liệu của trang này — kể cả tiến độ học.
            Chrome và Edge thường chỉ đồng ý khi bạn đã cài ứng dụng hoặc hay mở trang; Firefox sẽ hỏi bạn.
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button onClick={() => void ask()}>Xin trình duyệt giữ dữ liệu</Button>
            {asked && <span className="text-[12px] text-sumi-3">Trình duyệt chưa đồng ý lúc này — hãy tải bản sao lưu thường xuyên.</span>}
          </div>
        </>
      ) : (
        <p className="text-[13px] leading-relaxed text-sumi-2">
          Trình duyệt này không cho biết dữ liệu có được giữ lâu dài không (cần trình duyệt mới và trang chạy trên HTTPS).
          Hãy tải bản sao lưu thường xuyên.
        </p>
      )}

      {(local !== null || status.usage !== null) && (
        <p className="text-[12px] text-sumi-3 tnum">
          {local !== null && <>Dữ liệu học: {formatBytes(local)} / khoảng {formatBytes(LOCAL_STORAGE_BUDGET)} trình duyệt cho phép. </>}
          {status.usage !== null && <>Cả trang (gồm tệp để dùng offline): {formatBytes(status.usage)}.</>}
        </p>
      )}
    </Card>
  );
}
