"use client";

import { useSyncExternalStore } from "react";
import clsx from "clsx";
import { Button, Card, Chip, Seg } from "@/components/ui";
import type { InputMethod } from "@/lib/typing/engine";
import { CONTENT_INFO, type ContentType } from "@/lib/typing/phrases";
import { BELTS, beltFor, formatDuration, type TypingMode } from "@/lib/typing/score";
import { findBest, type TypingHistory } from "@/lib/typing/history";
import type { GameConfig } from "./useTypingGame";

export const METHOD_INFO: Record<InputMethod, { ja: string; label: string; hint: string }> = {
  ROMAJI: {
    ja: "ローマ字入力",
    label: "Romaji",
    hint: "Gõ phiên âm Latin, máy tự ra kana — cách đa số người Nhật gõ trên máy tính. Nhận mọi kiểu: shi/si, tsu/tu, kya/kixya…",
  },
  KANA: {
    ja: "かな入力",
    label: "Kana (JIS)",
    hint: "Mỗi phím là một chữ kana theo bố cục JIS, dấu ゛゜ là phím riêng. Cần bàn phím Nhật có in chữ kana.",
  },
  IME: {
    ja: "日本語IME",
    label: "Bộ gõ IME",
    hint: "Dùng bộ gõ tiếng Nhật của máy hoặc bàn phím flick trên điện thoại, đổi ra kanji như khi nhắn tin thật.",
  },
};

export const MODE_INFO: Record<TypingMode, { ja: string; label: string; hint: string }> = {
  PASSAGE: { ja: "課題文", label: "Bài mẫu", hint: "Gõ hết số câu cho trước, bấm giờ tới khi xong." },
  TIME_ATTACK: { ja: "タイムアタック", label: "Đua giờ", hint: "Gõ được càng nhiều càng tốt trước khi hết giờ." },
  SUDDEN_DEATH: { ja: "一発勝負", label: "Sinh tử", hint: "Sai một phím là dừng — luyện độ chính xác tuyệt đối." },
};

const CONTENTS: ContentType[] = ["HIRAGANA", "KATAKANA", "MIXED", "KANJI", "KANA_DRILL"];
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
  history,
}: {
  config: GameConfig;
  onChange: (c: GameConfig) => void;
  onStart: () => void;
  history: TypingHistory;
}) {
  const set = <K extends keyof GameConfig>(key: K, value: GameConfig[K]) => onChange({ ...config, [key]: value });
  const touch = useCoarsePointer();
  const best = findBest(history, config);

  return (
    <div className="flex flex-col gap-6">
      <div className="border-b border-rule/60 pb-4">
        <h1 className="font-mincho text-2xl font-bold text-sumi sm:text-3xl">Phòng Luyện Gõ</h1>
        <p className="mt-1 text-sm font-medium text-sumi-3">
          Gõ tiếng Nhật theo câu mẫu, bấm giờ và chấm điểm theo tốc độ × độ chính xác — như các bài thi gõ phím của Nhật.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-5">
          <Section step="1" title="Nội dung">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {CONTENTS.map((c) => (
                <Tile key={c} active={config.content === c} onClick={() => set("content", c)} {...CONTENT_INFO[c]} />
              ))}
            </div>
            {config.content === "KANA_DRILL" && (
              <Seg
                className="mt-3 w-fit"
                value={config.drillScript}
                onChange={(v) => set("drillScript", v)}
                options={[
                  { value: "h", label: <span className="font-japanese text-sm">ひらがな</span> },
                  { value: "k", label: <span className="font-japanese text-sm">カタカナ</span> },
                ]}
              />
            )}
          </Section>

          <Section step="2" title="Cách nhập">
            <div className="grid gap-2 sm:grid-cols-3">
              {METHODS.map((m) => (
                <Tile key={m} active={config.method === m} onClick={() => set("method", m)} {...METHOD_INFO[m]} />
              ))}
            </div>
            {config.method === "KANA" && (
              <p className="mt-3 rounded-xl border border-rule/80 bg-paper-sunk px-3.5 py-2.5 text-[12.5px] text-sumi-2">
                Gõ theo chữ kana in trên phím (bố cục JIS). Bàn phím US không có phím <b>¥</b> và <b>ろ</b>: dùng{" "}
                <Code>`</Code> cho ー và <Code>Shift + `</Code> cho ろ.
              </p>
            )}
            {touch && config.method !== "IME" && (
              <p className="mt-3 rounded-xl border border-gold/30 bg-gold-tint px-3.5 py-2.5 text-[12.5px] font-medium text-gold">
                Cách nhập này đọc phím vật lý. Trên điện thoại, hãy chọn “Bộ gõ IME” để gõ bằng bàn phím flick.
              </p>
            )}
          </Section>

          <Section step="3" title="Chế độ">
            <div className="grid gap-2 sm:grid-cols-3">
              {MODES.map((m) => (
                <Tile key={m} active={config.mode === m} onClick={() => set("mode", m)} {...MODE_INFO[m]} />
              ))}
            </div>
            {config.mode === "PASSAGE" && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[12.5px] font-semibold text-sumi-2">Số câu</span>
                {[5, 10, 20].map((n) => (
                  <Chip key={n} active={config.phraseCount === n} onClick={() => set("phraseCount", n)}>
                    {n} câu
                  </Chip>
                ))}
              </div>
            )}
            {config.mode === "TIME_ATTACK" && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[12.5px] font-semibold text-sumi-2">Thời gian</span>
                {[30, 60, 120].map((n) => (
                  <Chip key={n} active={config.timeLimitSec === n} onClick={() => set("timeLimitSec", n)}>
                    {n} giây
                  </Chip>
                ))}
              </div>
            )}
          </Section>

          <Section step="4" title="Tuỳ chọn">
            <div className="flex flex-col gap-2.5">
              <Toggle
                checked={config.dictation}
                onChange={(v) => set("dictation", v)}
                label="Nghe chép (聞き取り)"
                hint="Che chữ và đọc to từng câu: nghe rồi gõ lại. Nhấn Space để nghe lại."
              />
            </div>
          </Section>

          <Button variant="solid" size="lg" onClick={onStart} className="self-start px-10">
            Bắt đầu gõ
          </Button>
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3 px-5 py-4">
            <span className="label-xs">Kỷ lục của bạn · bài này</span>
            {best ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="font-mincho text-4xl font-bold leading-none tnum">{best.bestScore}</span>
                  <span className="text-sm text-sumi-3">
                    {config.mode === "SUDDEN_DEATH" ? "phím liên tiếp" : `điểm · ${beltFor(best.bestScore).vi}`}
                  </span>
                </div>
                <p className="text-[12.5px] text-sumi-3 tnum">
                  Nhanh nhất {Math.round(best.bestKpm)} phím/phút · chính xác nhất {(best.bestAccuracy * 100).toFixed(1)}% ·{" "}
                  {best.plays} lượt
                </p>
              </>
            ) : (
              <p className="text-sm text-sumi-3">Chưa có lượt nào với lựa chọn này — gõ thử để lập kỷ lục đầu tiên.</p>
            )}

            {history.recent.length > 0 && (
              <div className="flex flex-col gap-1.5 border-t border-rule/70 pt-3">
                <span className="label-xs">Gần đây</span>
                {history.recent.slice(0, 5).map((s) => (
                  <div key={s.at} className="flex items-baseline justify-between gap-2 text-[12.5px]">
                    <span className="truncate text-sumi-2">
                      {CONTENT_INFO[s.content].label} · {METHOD_INFO[s.method].label} · {MODE_INFO[s.mode].label}
                    </span>
                    <b className="flex-none tnum text-sumi">{s.score}</b>
                  </div>
                ))}
                <p className="text-[11.5px] text-sumi-3 tnum">
                  Tổng {history.totalSessions} lượt · {formatDuration(history.totalDurationMs)} luyện gõ · lưu trên trình duyệt này
                </p>
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-2 px-5 py-4">
            <span className="label-xs">Mẹo gõ romaji như IME</span>
            <ul className="flex flex-col gap-1.5 text-[12.5px] leading-snug text-sumi-2">
              <Tip k="ん">gõ <Code>nn</Code>; trước phụ âm (trừ n, y) chỉ cần <Code>n</Code>: かんじ = <Code>kanji</Code></Tip>
              <Tip k="っ">gấp đôi phụ âm sau: きって = <Code>kitte</Code>, hoặc <Code>xtu</Code></Tip>
              <Tip k="ー">phím gạch ngang <Code>-</Code>: コーヒー = <Code>ko-hi-</Code></Tip>
              <Tip k="は/を">trợ từ vẫn gõ theo mặt chữ: <Code>ha</Code>, <Code>wo</Code></Tip>
              <Tip k="ゃ">kana nhỏ đứng riêng: <Code>xya</Code> / <Code>lya</Code></Tip>
              <Tip k="ファ">âm ngoại lai: <Code>fa</Code>, ティ <Code>thi</Code>, ディ <Code>dhi</Code>, ウィ <Code>wi</Code></Tip>
            </ul>
          </Card>

          <Card className="flex flex-col gap-2 px-5 py-4">
            <span className="label-xs">Thang đai · điểm = phím/phút × chính xác³</span>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] text-sumi-2">
              {BELTS.map((b) => (
                <li key={b.ja} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 flex-none rounded-full border border-rule-firm" style={{ background: b.color }} aria-hidden />
                  <span className="font-japanese">{b.ja}</span>
                  <span className="ml-auto text-sumi-3 tnum">{b.min}+</span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Section({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-sm font-bold text-sumi">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-sumi text-[11px] text-paper">{step}</span>
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

function Tile({
  active,
  onClick,
  ja,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  ja: string;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "flex h-full cursor-pointer flex-col gap-1 rounded-2xl border px-4 py-3 text-left transition-all duration-150",
        active
          ? "border-shu bg-shu-tint/70 shadow-sm shadow-shu/10"
          : "border-rule/80 bg-surface hover:border-rule-firm hover:bg-surface-2",
      )}
    >
      <span className={clsx("font-japanese text-[12px] leading-none", active ? "text-shu" : "text-sumi-3")} lang="ja">
        {ja}
      </span>
      <span className="text-[14px] font-bold text-sumi">{label}</span>
      <span className="text-[12px] leading-snug text-sumi-3">{hint}</span>
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
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
      className="flex cursor-pointer items-start gap-3 text-left disabled:cursor-not-allowed disabled:opacity-45"
    >
      <span
        className={clsx(
          "relative mt-0.5 h-5 w-9 flex-none rounded-full transition-colors",
          on ? "bg-shu" : "bg-rule-firm",
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all",
            on ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
      <span className="flex flex-col">
        <span className="text-[13px] font-semibold text-sumi">{label}</span>
        <span className="text-[12px] text-sumi-3">{hint}</span>
      </span>
    </button>
  );
}

function Tip({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="w-9 flex-none font-japanese font-bold text-sumi">{k}</span>
      <span>{children}</span>
    </li>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-paper-sunk px-1 font-mono text-[12px] text-sumi">{children}</code>;
}
