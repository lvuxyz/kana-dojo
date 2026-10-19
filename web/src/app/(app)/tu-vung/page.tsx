"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { WordsTabs } from "@/components/kanji/WordsTabs";
import { ManageDecksLink, useAddToDeck, type AddMsg } from "@/components/library/useAddToDeck";
import { useSpeech } from "@/components/typing/useSpeech";
import { Button, Card, Chip, Empty, Notice, SpeakButton } from "@/components/ui";
import { hanVietOf, kanjiInWord } from "@/lib/kanji";
import type { CardDraft } from "@/lib/space/library";
import type { Vocabulary } from "@/lib/types";
import { VOCAB_LEVELS, searchVocabulary } from "@/lib/vocabulary";

const DEFAULT_DECK_NAME = "Từ vựng của tôi";

/** Một từ có sẵn thành một thẻ: hỏi chữ, đáp nghĩa, kèm cách đọc làm gợi ý (không lặp lại khi từ vốn đã là kana). */
const toDraft = (v: Vocabulary): CardDraft => ({
  front: v.word,
  back: v.meaningVi,
  hint: v.reading !== v.word ? v.reading : v.romaji,
});

const SPEECH_RATE = 0.8;

export default function VocabPage() {
  const [level, setLevel] = useState(VOCAB_LEVELS[0]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<AddMsg | null>(null);
  const deck = useAddToDeck(DEFAULT_DECK_NAME, "từ");

  const { speak: speakJa, speaking, supported: canSpeak, missingVoice } = useSpeech();
  // Nút loa luôn hiển thị (tránh lệch HTML giữa server và client), trình duyệt không hỗ trợ thì báo khi bấm.
  const speak = (text: string, key: string) => {
    if (!canSpeak) return setMsg({ tone: "err", text: "Trình duyệt này không hỗ trợ đọc thành tiếng." });
    speakJa(text, { rate: SPEECH_RATE, key });
  };

  const words = useMemo(() => searchVocabulary(level, q), [level, q]);

  const has = (v: Vocabulary) => deck.has(toDraft(v));
  const add = (list: Vocabulary[]) => {
    const m = deck.add(list.map(toDraft));
    if (m) setMsg(m);
  };

  const addable = words.filter((v) => !has(v));

  return (
    <div className="flex flex-col gap-5">
      <WordsTabs />
      <div>
        <h1 className="font-mincho text-2xl font-semibold">Từ vựng</h1>
        <p className="mt-0.5 text-sm text-sumi-3">
          Từ vựng JLPT có sẵn kèm cách đọc, nghĩa tiếng Việt và câu ví dụ. Thêm từ nào bạn muốn nhớ vào một bộ thẻ của bạn để ôn theo lịch.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {VOCAB_LEVELS.map((l) => (
          <Chip key={l} active={level === l} onClick={() => setLevel(l)}>N{l}</Chip>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm từ, cách đọc hoặc nghĩa…"
          aria-label="Tìm từ vựng"
          className="ml-auto w-full rounded-lg border border-rule bg-surface px-3 py-1.5 text-sm outline-none focus:border-rule-firm sm:w-64"
        />
      </div>

      <Card className="flex flex-wrap items-end gap-3 px-4 py-3">
        {deck.picker}
        <Button variant="outline" size="sm" disabled={addable.length === 0} onClick={() => add(addable)}>
          Thêm {addable.length} từ đang hiển thị
        </Button>
        <ManageDecksLink />
      </Card>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {missingVoice && <Notice tone="err">Máy chưa cài giọng tiếng Nhật — âm thanh phát âm có thể sai.</Notice>}

      {words.length === 0 && <Empty title="Không có từ nào khớp" hint="Thử đổi cấp độ JLPT hoặc từ khoá khác." />}

      <div className="grid gap-2.5 sm:grid-cols-2">
        {words.map((v) => (
          <Card key={v.id} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1">
                <span className="font-mincho text-xl">{v.word}</span>
                <SpeakButton
                  active={speaking === `w${v.id}`}
                  label={`Phát âm từ “${v.word}” (${v.reading})`}
                  onClick={() => speak(v.word, `w${v.id}`)}
                />
              </span>
              {v.jlptLevel && <span className="rounded border border-rule px-1.5 text-[10.5px] text-sumi-3">N{v.jlptLevel}</span>}
            </div>
            <div className="mt-0.5 text-[12.5px] text-sumi-3">
              {v.reading} · {v.romaji}
              {hanVietOf(v.word) && <span className="ml-1.5 font-semibold tracking-wide text-genko">{hanVietOf(v.word)}</span>}
            </div>
            <div className="mt-1 text-sm">{v.meaningVi}</div>
            {v.exampleJa && (
              <div className="mt-2 border-l-2 border-genko/40 pl-2.5 text-[12.5px] text-sumi-2">
                <div className="flex items-start gap-1">
                  <span className="font-mincho pt-1">{v.exampleJa}</span>
                  <SpeakButton
                    active={speaking === `e${v.id}`}
                    label={`Phát âm câu ví dụ: ${v.exampleJa}`}
                    onClick={() => speak(v.exampleJa ?? "", `e${v.id}`)}
                  />
                </div>
                {v.exampleVi && <div className="text-sumi-3">{v.exampleVi}</div>}
              </div>
            )}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {has(v) ? (
                <span className="text-[12px] font-semibold text-genko">✓ Đã có trong bộ thẻ</span>
              ) : (
                <Button size="sm" variant="outline" onClick={() => add([v])} aria-label={`Thêm “${v.word}” vào bộ thẻ`}>＋ Thêm vào bộ thẻ</Button>
              )}
              {kanjiInWord(v.word).map((k) => (
                <Link
                  key={k.c}
                  href={`/kanji?c=${encodeURIComponent(k.c)}`}
                  title={`${k.hv} — ${k.vi}`}
                  aria-label={`Xem chữ Hán ${k.c} (${k.hv})`}
                  className="font-mincho rounded-md border border-rule px-1.5 text-[15px] text-sumi-2 hover:border-rule-firm hover:text-sumi"
                >
                  {k.c}
                </Link>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
