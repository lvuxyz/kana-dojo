import Link from "next/link";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-paper px-5 text-sumi">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="hanko-seal px-3 py-1 text-base">迷</span>
        <h1 className="font-mincho text-3xl font-bold">Không tìm thấy trang này</h1>
        <p className="text-sm leading-relaxed text-sumi-2">
          Đường dẫn có thể đã đổi hoặc gõ nhầm. Quay về trang chủ hoặc vào thẳng phòng luyện viết nhé.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-1">
          <Link href="/"><Button variant="solid">Về trang chủ</Button></Link>
          <Link href="/luyen-viet"><Button>Luyện viết</Button></Link>
        </div>
      </div>
    </div>
  );
}
