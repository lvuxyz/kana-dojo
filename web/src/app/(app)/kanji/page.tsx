"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { KanjiDetail } from "@/components/kanji/KanjiDetail";
import { WordsTabs } from "@/components/kanji/WordsTabs";
import { ManageDecksLink, useAddToDeck, type AddMsg } from "@/components/library/useAddToDeck";
import { useSpeech } from "@/components/typing/useSpeech";
import { Button, Card, Chip, Empty, Notice, Spinner } from "@/components/ui";
import { KANJI_LEVELS, RADICAL_NAMES, hanVietOf, kanjiOf, kanjiToDraft, radicalsOf, searchKanji, type KanjiEntry } from "@/lib/kanji";
import type { CardDraft } from "@/lib/space/library";

const DEFAULT_DECK_NAME = "Kanji của tôi";
const SPEECH_RATE = 0.75;

const wordDrafts = (k: KanjiEntry): CardDraft[] =>
  k.words.map(([w, r, vi]) => {
    const hv = hanVietOf(w);
    return { front: w, back: vi, hint: hv ? `${r} · ${hv}` : r };
  });

export default function KanjiPage() {
  // useSearchParams buộc phần dưới phải nằm trong Suspense khi xuất bản tĩnh.
  return (
    <Suspense fallback={<Spinner label="Đang mở bảng Kanji" />}>
      <KanjiBrowser />
    </Suspense>
  );
}

function KanjiBrowser() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const [level, setLevel] = useState(KANJI_LEVELS[0]);
  const [radical, setRadical] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<AddMsg | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  // Chữ đang mở nằm trên URL (?c=日) để chia sẻ được và nút Back của trình duyệt đóng nó.
  const current = kanjiOf(params.get("c") ?? "") ?? null;
  const open = (c: string | null) => {
    setMsg(null);
    router.push(c ? `${path}?c=${encodeURIComponent(c)}` : path, { scroll: false });
  };

  const list = useMemo(() => searchKanji(level, q, radical), [level, q, radical]);
  const radicals = useMemo(() => radicalsOf(level), [level]);
  // Chuyển trước/sau trong danh sách đang lọc; chữ mở từ liên kết ngoài danh sách thì đi theo cả cấp của nó.
  const nav = current && list.some((k) => k.c === current.c) ? list : searchKanji(current?.jlpt ?? level, "");
  const index = current ? nav.findIndex((k) => k.c === current.c) : -1;
  const step = (d: number) => {
    if (nav.length) open(nav[(index + d + nav.length) % nav.length].c);
  };

  useEffect(() => {
    // Trên điện thoại khung chi tiết nằm trên lưới: cuộn tới khi mở chữ.
    if (current && window.matchMedia("(max-width: 1023px)").matches) detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [current]);

  // ← → đổi chữ, Esc đóng — trừ khi đang gõ trong ô tìm kiếm.
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e) => {
    if (!current || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
    if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
    else if (e.key === "Escape") open(null);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const deck = useAddToDeck(DEFAULT_DECK_NAME);
  const add = (drafts: CardDraft[]) => {
    const m = deck.add(drafts);
    if (m) setMsg(m);
  };
  const addable = list.map(kanjiToDraft).filter((d) => !deck.has(d));

  const { speak: speakJa, speaking, supported: canSpeak, missingVoice } = useSpeech();
  const speak = (text: string, key: string) => {
    if (!canSpeak) return setMsg({ tone: "err", text: "Trình duyệt này không hỗ trợ đọc thành tiếng." });
    speakJa(text, { rate: SPEECH_RATE, key });
  };

  const pickRadical = (r: string | null) => {
    setRadical(r);
    setQ("");
  };

  return (
    <div className="flex flex-col gap-5">
      <WordsTabs />
      <div>
        <h1 className="font-mincho text-2xl font-semibold">Kanji</h1>
        <p className="mt-0.5 text-sm text-sumi-3">
          Tra chữ Hán theo chữ, <b className="font-semibold text-sumi-2">âm Hán Việt</b> (gõ không dấu cũng được) hoặc nghĩa. Mỗi chữ có chiết tự,
          cách nhớ, âm On/Kun, từ ví dụ và khung tập viết đúng thứ tự nét.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {KANJI_LEVELS.map((l) => (
          <Chip key={l} active={level === l} onClick={() => { setLevel(l); setRadical(null); }}>N{l}</Chip>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nhập kanji, âm Hán Việt hoặc nghĩa…"
          aria-label="Tìm kanji"
          className="ml-auto w-full rounded-lg border border-rule bg-surface px-3 py-1.5 text-sm outline-none focus:border-rule-firm sm:w-72"
        />
      </div>

      <details className="rounded-xl border border-rule/80 bg-surface px-3.5 py-2" open={radical !== null || undefined}>
        <summary className="cursor-pointer select-none text-[13px] font-medium text-sumi-2">
          Lọc theo bộ thủ
          {radical && <span className="ml-1 text-shu">· <span lang="ja" className="font-mincho">{radical}</span> {RADICAL_NAMES[radical]}</span>}
        </summary>
        <div className="mt-2 flex flex-wrap gap-1.5 pb-1">
          <button
            type="button"
            onClick={() => pickRadical(null)}
            aria-pressed={radical === null}
            className={clsx("cursor-pointer rounded-lg border px-2.5 py-1 text-[12px]", radical === null ? "border-shu bg-shu text-white" : "border-rule hover:border-rule-firm")}
          >
            Tất cả
          </button>
          {radicals.map((r) => (
            <button
              key={r.radical}
              type="button"
              onClick={() => pickRadical(radical === r.radical ? null : r.radical)}
              aria-pressed={radical === r.radical}
              title={`Bộ ${r.name} — ${r.count} chữ`}
              className={clsx(
                "flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px]",
                radical === r.radical ? "border-shu bg-shu text-white" : "border-rule text-sumi-2 hover:border-rule-firm",
              )}
            >
              <span lang="ja" className="font-mincho text-base">{r.radical}</span>
              {r.name}
              <span className="tnum opacity-60">{r.count}</span>
            </button>
          ))}
        </div>
      </details>

      <Card className="flex flex-wrap items-end gap-3 px-4 py-3">
        {deck.picker}
        <Button variant="outline" size="sm" disabled={addable.length === 0} onClick={() => add(addable)}>
          Thêm {addable.length} chữ đang hiển thị
        </Button>
        <ManageDecksLink />
      </Card>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {missingVoice && <Notice tone="err">Máy chưa cài giọng tiếng Nhật — âm thanh phát âm có thể sai.</Notice>}

      <div className={clsx("grid gap-5", current && "lg:grid-cols-[minmax(0,1fr)_420px]")}>
        {current && (
          <div ref={detailRef} className="scroll-mt-20 lg:order-2">
            <Card className="px-4 py-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
              <KanjiDetail
                k={current}
                index={Math.max(index, 0)}
                total={nav.length}
                onPrev={() => step(-1)}
                onNext={() => step(1)}
                onPick={open}
                onRadical={(r) => { setLevel(current.jlpt); pickRadical(r); }}
                onClose={() => open(null)}
                speak={speak}
                speaking={speaking}
                hasCard={deck.has(kanjiToDraft(current))}
                onAddCard={() => add([kanjiToDraft(current)])}
                wordsAdded={wordDrafts(current).every((d) => deck.has(d))}
                onAddWords={() => add(wordDrafts(current))}
              />
            </Card>
          </div>
        )}

        <div className="lg:order-1">
          {list.length === 0 && <Empty title="Không có chữ nào khớp" hint="Thử bỏ dấu, đổi bộ thủ hoặc từ khoá khác." />}
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
            {list.map((k) => (
              <li key={k.c}>
                <button
                  type="button"
                  onClick={() => open(current?.c === k.c ? null : k.c)}
                  aria-pressed={current?.c === k.c}
                  aria-label={`${k.c} — ${k.hv}, ${k.vi}`}
                  className={clsx(
                    "flex w-full cursor-pointer flex-col items-center rounded-xl border px-1 pb-1.5 pt-2 transition-colors",
                    current?.c === k.c ? "border-shu bg-shu-tint" : "border-rule/80 bg-surface hover:border-rule-firm",
                  )}
                >
                  <span lang="ja" className="font-mincho text-3xl leading-tight">{k.c}</span>
                  <span className="text-[10.5px] font-semibold tracking-wide text-sumi-2">{k.hv}</span>
                  <span className="w-full truncate text-center text-[10.5px] text-sumi-3">{k.vi}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
