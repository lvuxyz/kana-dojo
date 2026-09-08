import Link from "next/link";

export function Brand({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 flex-none place-items-center rounded-[3px] bg-shu font-mincho text-xl font-semibold text-white">
        仮
      </span>
      {!compact && (
        <span className="flex flex-col leading-tight">
          <b className="font-mincho text-[17px] font-semibold">Kana Dōjō</b>
          <span className="text-[11px] text-sumi-3">Luyện viết Hiragana &amp; Katakana</span>
        </span>
      )}
    </Link>
  );
}
