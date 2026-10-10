"use client";

import { useEffect, useSyncExternalStore } from "react";
import clsx from "clsx";
import { Button, Card, Chip, Seg } from "@/components/ui";
import type { InputMethod } from "@/lib/typing/engine";
import { CONTENT_INFO, DRILL_GROUPS, type ContentType } from "@/lib/typing/phrases";
import { BELTS, beltFor, formatDuration, type TypingMode } from "@/lib/typing/score";
import { STUCK_AFTER } from "./useTypingGame";
import { findBest, weakList, type TypingHistory } from "@/lib/typing/history";
import { useSpace } from "@/lib/space/hooks";
import { userPhrases } from "@/lib/typing/phrases";
import { SOUND_THEMES, playKeySound } from "@/lib/typing/sound";
import type { GameConfig } from "./useTypingGame";

export const METHOD_INFO: Record<InputMethod, { ja: string; label: string; hint: string }> = {
  ROMAJI: {
    ja: "ローマ字入力",
    label: "Romaji",
    hint: "Gõ phiên âm Latin (shi/si, tsu/tu, kya…)",
  },
  KANA: {
    ja: "かな入力",
    label: "Kana (JIS)",
    hint: "Mỗi phím là một chữ kana theo bố cục JIS",
  },
  IME: {
    ja: "日本語IME",
    label: "Bộ gõ IME",
    hint: "Dùng bộ gõ tiếng Nhật của máy / bàn phím flick",
  },
};

export const MODE_INFO: Record<TypingMode, { ja: string; label: string; hint: string }> = {
  PASSAGE: { ja: "課題文", label: "Bài mẫu", hint: "Gõ hết số câu cho trước, bấm giờ đến khi xong" },
  TIME_ATTACK: { ja: "タイムアタック", label: "Đua giờ", hint: "Gõ được càng nhiều càng tốt trước khi hết giờ" },
  SUDDEN_DEATH: { ja: "一発勝負", label: "Sinh tử", hint: "Sai một phím là dừng — luyện độ chính xác tuyệt đối" },
};

const CONTENT_STAMPS: Record<ContentType, string> = {
  HIRAGANA: "あ",
  KATAKANA: "ア",
  MIXED: "あ/ア",
  KANJI: "漢字",
  KANA_DRILL: "五十音",
  WEAK: "苦手",
  MINE: "自作",
};

const CONTENTS: ContentType[] = ["HIRAGANA", "KATAKANA", "MIXED", "KANJI", "KANA_DRILL", "WEAK", "MINE"];
const METHODS: InputMethod[] = ["ROMAJI", "KANA", "IME"];
const MODES: TypingMode[] = ["PASSAGE", "TIME_ATTACK", "SUDDEN_DEATH"];

/** Máy chỉ có màn hình cảm ứng (điện thoại) thì không có sự kiện phím vật lý để đọc romaji/kana. */
function useCoarsePointer() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(pointer: coarse)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false,
  );
}

export function TypingSetup({
  config,
  onChange,
  onStart,
  onPracticeWeak,
  history,
}: {
  config: GameConfig;
  onChange: (c: GameConfig) => void;
  onStart: () => void;
  /** Chọn nội dung "Chữ hay sai" và bắt đầu ngay */
  onPracticeWeak: () => void;
  history: TypingHistory;
}) {
  const set = <K extends keyof GameConfig>(key: K, value: GameConfig[K]) => onChange({ ...config, [key]: value });
  const touch = useCoarsePointer();
  const { space } = useSpace();
  const best = findBest(history, config);
  const weak = weakList(history);
  // Chỉ những câu gõ được mới tính — đúng bộ lọc mà ván gõ sẽ dùng.
  const mineCount = userPhrases(space.library.texts).length;

  // Lắng nghe phím Enter để bắt đầu ván nhanh từ màn hình cài đặt
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.repeat && !e.isComposing) {
        const tag = (document.activeElement?.tagName || "").toLowerCase();
        if (tag !== "input" && tag !== "textarea") {
          e.preventDefault();
          onStart();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStart]);

  const contentHint = (c: ContentType) => {
    if (c === "MINE") {
      return mineCount > 0 ? `${mineCount} câu bạn đã soạn trong Thư viện` : "Chưa có câu nào — soạn ở Thư viện";
    }
    if (c !== "WEAK") return CONTENT_INFO[c].hint;
    return weak.length > 0 ? `Theo dõi ${weak.length} chữ bạn hay gõ sai` : "Chưa có dữ liệu chữ sai";
  };

  const drillOptions =
    config.content === "KANA_DRILL" ||
    (config.content === "WEAK" && weak.length === 0) ||
    (config.content === "MINE" && mineCount === 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Header gọn gàng với nút Bắt đầu gõ trực diện */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule/70 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mincho text-2xl font-bold text-sumi sm:text-3xl">Phòng Luyện Gõ</h1>
            <span className="rounded-full border border-shu/30 bg-shu-tint/80 px-2.5 py-0.5 font-japanese text-[11px] font-bold text-shu">
              打鍵道場
            </span>
          </div>
          <p className="mt-0.5 text-xs font-medium text-sumi-3 sm:text-sm">
            Rèn tốc độ và độ chuẩn xác theo câu mẫu — chuẩn kỳ thi gõ phím Nhật Bản.
          </p>
        </div>

        <Button variant="solid" size="lg" onClick={onStart} className="px-6 py-2.5 shadow-md">
          <span>Bắt đầu gõ</span>
          <kbd className="hidden rounded border border-white/40 px-1.5 py-0.5 text-[10.5px] font-mono sm:inline">
            Enter
          </kbd>
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Cột trái: Cấu hình chính (Tối ưu không gian) */}
        <div className="flex flex-col gap-4">
          {/* 1. Nội dung */}
          <Section step="1" title="Nội dung bài gõ">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {CONTENTS.map((c) => (
                <Tile
                  key={c}
                  active={config.content === c}
                  onClick={() => set("content", c)}
                  stamp={CONTENT_STAMPS[c]}
                  ja={CONTENT_INFO[c].ja}
                  label={CONTENT_INFO[c].label}
                  hint={contentHint(c)}
                />
              ))}
            </div>

            {drillOptions && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-xl border border-rule/70 bg-paper-sunk/50 px-3 py-2">
                <span className="text-[12px] font-semibold text-sumi-2">Bảng chữ:</span>
                <Seg
                  className="w-fit"
                  value={config.drillScript}
                  onChange={(v) => set("drillScript", v)}
                  options={[
                    { value: "h", label: <span className="font-japanese text-xs font-medium">ひらがな</span> },
                    { value: "k", label: <span className="font-japanese text-xs font-medium">カタカナ</span> },
                  ]}
                />
                <span className="ml-2 text-[12px] font-semibold text-sumi-2">Nhóm:</span>
                {DRILL_GROUPS.map((g) => (
                  <Chip key={g.value} active={config.drillGroup === g.value} onClick={() => set("drillGroup", g.value)}>
                    {g.label}
                  </Chip>
                ))}
              </div>
            )}
          </Section>

          {/* 2 & 3: Cách nhập và Chế độ (Đặt cạnh nhau để tiết kiệm 50% chiều cao) */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* 2. Cách nhập */}
            <Section step="2" title="Cách nhập">
              <div className="grid grid-cols-1 gap-2">
                {METHODS.map((m) => (
                  <Tile
                    key={m}
                    active={config.method === m}
                    onClick={() => set("method", m)}
                    ja={METHOD_INFO[m].ja}
                    label={METHOD_INFO[m].label}
                    hint={METHOD_INFO[m].hint}
                    compact
                  />
                ))}
              </div>
              {config.method === "KANA" && (
                <p className="mt-2 rounded-xl border border-rule/80 bg-paper-sunk px-3 py-2 text-[11.5px] text-sumi-2">
                  Bàn phím US: dùng <Code>`</Code> cho ー và <Code>Shift + `</Code> cho ろ.
                </p>
              )}
              {touch && config.method !== "IME" && (
                <p className="mt-2 rounded-xl border border-gold/30 bg-gold-tint px-3 py-2 text-[11.5px] font-medium text-gold">
                  Màn hình cảm ứng: nên chọn “Bộ gõ IME” để gõ bằng bàn phím flick.
                </p>
              )}
            </Section>

            {/* 3. Chế độ */}
            <Section step="3" title="Chế độ gõ">
              <div className="grid grid-cols-1 gap-2">
                {MODES.map((m) => (
                  <Tile
                    key={m}
                    active={config.mode === m}
                    onClick={() => set("mode", m)}
                    ja={MODE_INFO[m].ja}
                    label={MODE_INFO[m].label}
                    hint={MODE_INFO[m].hint}
                    compact
                  />
                ))}
              </div>

              {config.mode === "PASSAGE" && (
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-rule/60 bg-paper-sunk/40 px-3 py-1.5">
                  <span className="text-[12px] font-semibold text-sumi-2">Số câu:</span>
                  {[5, 10, 20].map((n) => (
                    <Chip key={n} active={config.phraseCount === n} onClick={() => set("phraseCount", n)}>
                      {n} câu
                    </Chip>
                  ))}
                </div>
              )}
              {config.mode === "TIME_ATTACK" && (
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-rule/60 bg-paper-sunk/40 px-3 py-1.5">
                  <span className="text-[12px] font-semibold text-sumi-2">Thời gian:</span>
                  {[30, 60, 120].map((n) => (
                    <Chip key={n} active={config.timeLimitSec === n} onClick={() => set("timeLimitSec", n)}>
                      {n}s
                    </Chip>
                  ))}
                </div>
              )}
            </Section>
          </div>

          {/* 4. Tuỳ chọn & Âm thanh gõ phím */}
          <Section step="4" title="Tuỳ chọn &amp; Phản hồi âm thanh">
            {/* 4 Toggles trong lưới 2x2 gọn gàng */}
            <div className="grid gap-2 sm:grid-cols-2">
              <ToggleCard
                checked={config.showMeaning}
                onChange={(v) => set("showMeaning", v)}
                label="Hiện nghĩa tiếng Việt"
                ja="意味"
                hint="Hiện bản dịch tiếng Việt dưới câu mẫu khi đang gõ"
              />
              <ToggleCard
                checked={config.hideFurigana}
                onChange={(v) => set("hideFurigana", v)}
                label="Ẩn furigana"
                ja="ふりがな"
                hint="Chỉ với Kanji: tự nhớ cách đọc trước khi gõ"
                disabled={config.content !== "KANJI"}
              />
              <ToggleCard
                checked={config.stuckHint}
                onChange={(v) => set("stuckHint", v)}
                label="Gợi ý khi bị kẹt"
                ja="ヒント"
                hint={`Sai ${STUCK_AFTER} lần liên tiếp mới hiện phím gợi ý`}
              />
              <ToggleCard
                checked={config.dictation}
                onChange={(v) => set("dictation", v)}
                label="Nghe chép"
                ja="聞き取り"
                hint="Che chữ và đọc to từng câu; bấm Space để nghe lại"
              />
            </div>

            {/* Thanh điều khiển âm thanh cơ học */}
            <div className="flex flex-col gap-2 rounded-2xl border border-rule/80 bg-paper-sunk/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-bold text-sumi">Âm thanh gõ phím</span>
                <span className="text-[11px] text-sumi-3">Web Audio API · Không độ trễ</span>
              </div>
              <div className="grid grid-cols-2 min-[420px]:grid-cols-3 sm:grid-cols-5 gap-1.5">
                {SOUND_THEMES.map((st, idx) => (
                  <button
                    key={st.value}
                    type="button"
                    onClick={() => {
                      set("soundTheme", st.value);
                      if (st.value !== "off") playKeySound(st.value, config.soundVolume);
                    }}
                    className={clsx(
                      "flex flex-col items-center rounded-xl border p-2 text-center transition-all cursor-pointer",
                      idx === 4 && "col-span-2 min-[420px]:col-span-1",
                      config.soundTheme === st.value
                        ? "border-shu bg-shu/10 text-shu shadow-xs font-semibold ring-1 ring-shu/25"
                        : "border-rule/80 bg-surface text-sumi-2 hover:border-rule-firm hover:text-sumi",
                    )}
                  >
                    <span className="text-[12px]">{st.label}</span>
                    <span className="font-japanese text-[10px] opacity-75">{st.ja}</span>
                  </button>
                ))}
              </div>
              {config.soundTheme !== "off" && (
                <div className="mt-0.5 flex flex-wrap items-center gap-2 border-t border-rule/50 pt-2">
                  <span className="text-[11.5px] font-medium text-sumi-3">Âm lượng</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[0.2, 0.4, 0.6, 0.8, 1.0].map((vol) => (
                      <button
                        key={vol}
                        type="button"
                        onClick={() => {
                          set("soundVolume", vol);
                          playKeySound(config.soundTheme, vol);
                        }}
                        className={clsx(
                          "h-6 w-9 rounded-md text-[11px] font-medium transition-colors cursor-pointer",
                          Math.abs(config.soundVolume - vol) < 0.05
                            ? "bg-sumi text-paper"
                            : "bg-rule/40 text-sumi-2 hover:bg-rule/70 hover:text-sumi",
                        )}
                      >
                        {Math.round(vol * 100)}%
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-sumi-3 italic sm:ml-auto">Bấm để nghe thử</span>
                </div>
              )}
            </div>
          </Section>

          {/* Nút bắt đầu gõ ở cuối cho mobile hoặc khi cuộn */}
          <div className="pt-1">
            <Button variant="solid" size="lg" onClick={onStart} className="w-full sm:w-auto px-10">
              Bắt đầu gõ <kbd className="ml-1.5 rounded border border-white/40 px-1 text-[10px]">Enter</kbd>
            </Button>
          </div>
        </div>

        {/* Cột phải: Kỷ lục, Chữ sai & Tra cứu (Xếp gọn gàng) */}
        <aside className="flex flex-col gap-3.5">
          {/* Thẻ Kỷ lục cá nhân */}
          <Card className="flex flex-col gap-3 px-4.5 py-4">
            <div className="flex items-center justify-between">
              <span className="label-xs">Kỷ lục của bạn · bài này</span>
              {best && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10.5px] font-bold"
                  style={{ background: beltFor(best.bestScore).color + "25", color: beltFor(best.bestScore).color === "#1d1d1d" ? "var(--sumi)" : beltFor(best.bestScore).color }}
                >
                  {beltFor(best.bestScore).ja} · {beltFor(best.bestScore).vi}
                </span>
              )}
            </div>
            {best ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="font-mincho text-3xl font-bold leading-none tnum text-sumi sm:text-4xl">
                    {best.bestScore}
                  </span>
                  <span className="text-xs text-sumi-3">
                    {config.mode === "SUDDEN_DEATH" ? "phím liên tiếp" : "điểm"}
                  </span>
                </div>
                <p className="text-[12px] text-sumi-3 tnum">
                  Nhanh nhất <b>{Math.round(best.bestKpm)}</b> phím/phút · chính xác <b>{(best.bestAccuracy * 100).toFixed(1)}%</b> ·{" "}
                  {best.plays} lượt
                </p>
              </>
            ) : (
              <p className="text-xs text-sumi-3">Chưa có lượt nào với lựa chọn này — gõ thử để lập kỷ lục đầu tiên.</p>
            )}

            {history.recent.length > 0 && (
              <div className="flex flex-col gap-1 border-t border-rule/70 pt-2.5">
                <span className="label-xs">Gần đây</span>
                {history.recent.slice(0, 3).map((s) => (
                  <div key={s.at} className="flex items-baseline justify-between gap-2 text-[12px]">
                    <span className="truncate text-sumi-2">
                      {CONTENT_INFO[s.content].label} · {METHOD_INFO[s.method].label}
                    </span>
                    <b className="flex-none tnum text-sumi">{s.score}</b>
                  </div>
                ))}
                <p className="mt-0.5 text-[11px] text-sumi-3 tnum">
                  Tổng {history.totalSessions} lượt · {formatDuration(history.totalDurationMs)}
                </p>
              </div>
            )}
          </Card>

          {/* Thẻ Chữ bạn hay gõ sai (Chỉ hiện khi có dữ liệu) */}
          {weak.length > 0 && (
            <Card className="flex flex-col gap-2.5 px-4.5 py-3.5">
              <span className="label-xs">Chữ bạn hay gõ sai</span>
              <div className="flex flex-wrap gap-1" lang="ja">
                {weak.slice(0, 10).map(([kana]) => (
                  <span
                    key={kana}
                    className="rounded-lg border border-rule/80 bg-paper-sunk px-2 py-0.5 font-japanese text-sm text-sumi"
                  >
                    {kana}
                  </span>
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={onPracticeWeak} className="self-start text-xs">
                Luyện các chữ này
              </Button>
            </Card>
          )}

          {/* Thẻ Tra cứu thu gọn (Accordion tiết kiệm không gian) */}
          <details className="group rounded-2xl border border-rule/80 bg-surface/80 p-3.5 shadow-xs transition-colors open:bg-surface">
            <summary className="flex cursor-pointer select-none items-center justify-between text-xs font-bold text-sumi">
              <span className="flex items-center gap-1.5">
                <span>💡</span> Mẹo gõ Romaji như IME
              </span>
              <span className="text-xs text-sumi-3 transition-transform group-open:rotate-180">▾</span>
            </summary>
            <ul className="mt-2.5 flex flex-col gap-1.5 border-t border-rule/60 pt-2.5 text-[12px] leading-snug text-sumi-2">
              <Tip k="ん">gõ <Code>nn</Code>; trước phụ âm khác chỉ cần <Code>n</Code>: かんじ = <Code>kanji</Code></Tip>
              <Tip k="っ">gấp đôi phụ âm sau: きって = <Code>kitte</Code>, hoặc <Code>xtu</Code></Tip>
              <Tip k="ー">phím gạch ngang <Code>-</Code>: コーヒー = <Code>ko-hi-</Code></Tip>
              <Tip k="は/を">trợ từ vẫn gõ theo mặt chữ: <Code>ha</Code>, <Code>wo</Code></Tip>
              <Tip k="ゃ">kana nhỏ đứng riêng: <Code>xya</Code> / <Code>lya</Code></Tip>
              <Tip k="ファ">âm ngoại lai: <Code>fa</Code>, ティ <Code>thi</Code>, ディ <Code>dhi</Code>, ウィ <Code>wi</Code></Tip>
            </ul>
          </details>

          <details className="group rounded-2xl border border-rule/80 bg-surface/80 p-3.5 shadow-xs transition-colors open:bg-surface">
            <summary className="flex cursor-pointer select-none items-center justify-between text-xs font-bold text-sumi">
              <span className="flex items-center gap-1.5">
                <span>🥋</span> Thang đai Dōjō (Dan/Kyu)
              </span>
              <span className="text-xs text-sumi-3 transition-transform group-open:rotate-180">▾</span>
            </summary>
            <div className="mt-2.5 border-t border-rule/60 pt-2.5">
              <p className="mb-2 text-[11px] text-sumi-3">Điểm = Phím/phút × Chính xác³</p>
              <ul className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11.5px] text-sumi-2">
                {BELTS.map((b) => (
                  <li key={b.ja} className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 flex-none rounded-full border border-rule-firm"
                      style={{ background: b.color }}
                      aria-hidden
                    />
                    <span className="font-japanese text-[11px]">{b.ja}</span>
                    <span className="ml-auto text-sumi-3 tnum">{b.min}+</span>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </aside>
      </div>
    </div>
  );
}

function Section({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="flex items-center gap-2 text-[13px] font-bold text-sumi">
        <span className="grid h-4.5 w-4.5 place-items-center rounded-full bg-sumi text-[10px] text-paper">{step}</span>
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

function Tile({
  active,
  onClick,
  stamp,
  ja,
  label,
  hint,
  compact = false,
}: {
  active: boolean;
  onClick: () => void;
  stamp?: string;
  ja: string;
  label: string;
  hint: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "group relative flex cursor-pointer rounded-2xl border text-left transition-all duration-150 select-none",
        compact ? "flex-col gap-1 p-2.5 sm:p-3" : "flex-col gap-1.5 p-3 sm:p-3.5",
        active
          ? "border-shu bg-shu-tint/70 shadow-sm shadow-shu/10 ring-1 ring-shu/25"
          : "border-rule/80 bg-surface hover:border-rule-firm hover:bg-surface-2",
      )}
    >
      <div className="flex w-full items-center justify-between gap-1.5">
        {stamp ? (
          <span
            className={clsx(
              "grid h-6 w-6 flex-none place-items-center rounded-md text-[11px] font-bold transition-colors font-japanese",
              active ? "bg-shu text-white" : "bg-paper-sunk text-sumi-2 group-hover:bg-paper-sunk/80",
            )}
          >
            {stamp}
          </span>
        ) : (
          <span className={clsx("font-japanese text-[11px] leading-none", active ? "text-shu font-bold" : "text-sumi-3")}>
            {ja}
          </span>
        )}
        {stamp && (
          <span className={clsx("font-japanese text-[11px] leading-none", active ? "text-shu font-bold" : "text-sumi-3")}>
            {ja}
          </span>
        )}
      </div>
      <div>
        <span className="block text-[13px] font-bold text-sumi leading-tight">{label}</span>
        <span className="mt-0.5 block line-clamp-1 text-[11px] leading-tight text-sumi-3">{hint}</span>
      </div>
    </button>
  );
}

function ToggleCard({
  checked,
  onChange,
  label,
  ja,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  ja: string;
  hint: string;
  disabled?: boolean;
}) {
  const on = checked && !disabled;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-40",
        on
          ? "border-shu/40 bg-shu-tint/50 shadow-2xs"
          : "border-rule/70 bg-surface/70 hover:border-rule-firm hover:bg-surface",
      )}
    >
      <span
        className={clsx(
          "relative mt-0.5 h-4.5 w-8 flex-none rounded-full transition-colors",
          on ? "bg-shu" : "bg-rule-firm",
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-all",
            on ? "left-[16px]" : "left-0.5",
          )}
        />
      </span>
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[12.5px] font-bold text-sumi leading-tight">{label}</span>
          <span className="font-japanese text-[10px] text-sumi-3">({ja})</span>
        </div>
        <span className="line-clamp-1 text-[11px] text-sumi-3 leading-snug">{hint}</span>
      </div>
    </button>
  );
}

function Tip({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="w-8 flex-none font-japanese font-bold text-sumi">{k}</span>
      <span>{children}</span>
    </li>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-paper-sunk px-1 font-mono text-[11.5px] text-sumi">{children}</code>;
}
