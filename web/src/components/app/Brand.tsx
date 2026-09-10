import Link from "next/link";

export function Brand({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3.5 transition-all duration-200 hover:opacity-95"
    >
      {/* Biểu tượng triện son hoàng gia (Royal Hanko Seal) */}
      <span className="relative grid h-10 w-10 flex-none place-items-center rounded-xl bg-gradient-to-br from-shu via-shu to-shu-2 font-mincho text-[22px] font-bold text-white shadow-lg shadow-shu/25 ring-1 ring-white/25 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-shu/35 group-hover:ring-gold/50">
        {/* Nét chữ thư pháp Kanji chính */}
        <span className="relative z-10 select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
          仮
        </span>
        {/* Khung viền đôi nghệ thuật truyền thống của con dấu triện son */}
        <span className="absolute inset-1 rounded-[7px] border border-white/40 pointer-events-none" />
        <span className="absolute -inset-0.5 rounded-xl bg-gradient-to-tr from-gold/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
      </span>

      {!compact && (
        <span className="flex flex-col leading-tight">
          <span className="flex items-center gap-2 font-mincho text-[19px] font-bold tracking-tight text-sumi">
            <span>Kana Dōjō</span>
            <span className="inline-flex items-center rounded-md border border-genko/30 bg-genko-tint/90 px-1.5 py-0.5 font-sans text-[10.5px] font-bold tracking-wider text-genko shadow-2xs">
              道場
            </span>
          </span>
          <span className="font-sans text-[11.5px] font-medium tracking-normal text-sumi-3">
            Luyện viết Hiragana &amp; Katakana chuẩn nét
          </span>
        </span>
      )}
    </Link>
  );
}
