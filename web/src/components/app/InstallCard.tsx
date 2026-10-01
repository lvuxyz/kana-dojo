"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { detectInstallContext, type InstallContext } from "@/lib/pwa";

/** Sự kiện chưa có trong lib.dom của TypeScript. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallCard() {
  // null = chưa biết (phía máy chủ và lúc hydrate) → không hiện gì để khỏi nháy.
  const [context, setContext] = useState<InstallContext | null>(null);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setContext(
      detectInstallContext({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        maxTouchPoints: navigator.maxTouchPoints,
        standaloneMedia: window.matchMedia("(display-mode: standalone)").matches,
        navigatorStandalone: (navigator as Navigator & { standalone?: boolean }).standalone === true,
      }),
    );
    // Trình duyệt hỗ trợ cài sẽ báo "có thể cài" bằng sự kiện này; giữ lại để mở hộp thoại khi người dùng bấm nút.
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent); };
    const onInstalled = () => { setDeferred(null); setContext("installed"); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null); // mỗi sự kiện chỉ dùng được một lần
  };

  if (context === null) return null;

  return (
    <Card className="flex flex-col gap-3 px-5 py-4">
      <span className="label-xs">Cài ra màn hình chính</span>

      {context === "installed" ? (
        <p className="text-[13px] leading-relaxed text-sumi-2">
          Bạn đang dùng bản đã cài. Sau lần mở đầu tiên, ứng dụng chạy được cả khi không có mạng.
        </p>
      ) : (
        <>
          <p className="text-[13px] leading-relaxed text-sumi-2">
            Cài Kana Dōjō như một ứng dụng: mở toàn màn hình từ biểu tượng ngoài màn hình chính và chạy được khi không có mạng.
          </p>

          {context === "ios" ? (
            <>
              <ol className="list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-sumi-2">
                <li>Mở trang này bằng <b>Safari</b>.</li>
                <li>Bấm nút <b>Chia sẻ</b> (hình ô vuông có mũi tên lên).</li>
                <li>Chọn <b>Thêm vào Màn hình chính</b>.</li>
              </ol>
              <p className="rounded-xl border border-gold/40 bg-gold-tint/80 px-3.5 py-2.5 text-[12.5px] font-medium leading-relaxed text-sumi-2">
                Trên iPhone/iPad, bản đã cài có <b>kho dữ liệu riêng</b>, tách khỏi Safari — mở lần đầu bạn sẽ thấy tiến độ trống.
                Hãy <b>Tải tiến độ về máy</b> ở đây trước, rồi vào <b>Cài đặt → Khôi phục từ tệp</b> trong ứng dụng vừa cài.
                Đổi lại, Safari có thể xoá dữ liệu của trang web nếu bạn không mở nó trong 7 ngày, còn bản đã cài thì được miễn quy tắc đó.
              </p>
            </>
          ) : deferred ? (
            <Button variant="solid" onClick={install} className="self-start">Cài đặt ứng dụng</Button>
          ) : (
            <p className="text-[12.5px] leading-relaxed text-sumi-3">
              Trình duyệt này chưa đề nghị cài đặt. Hãy tìm mục <b>Cài đặt ứng dụng</b> hoặc <b>Thêm vào màn hình chính</b> trong menu của trình duyệt
              (cần HTTPS). Nếu ứng dụng đã cài trông trống tiến độ, dùng <b>Khôi phục từ tệp</b> ở mục Sao lưu bên dưới.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
