"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card, Chip, Empty, Notice, Select } from "@/components/ui";
import { addCards, addDeck, type CardDraft } from "@/lib/space/library";
import { useSpace } from "@/lib/space/hooks";
import { updateSpace } from "@/lib/space/store";
import type { Vocabulary } from "@/lib/types";
import { VOCAB_LEVELS, searchVocabulary } from "@/lib/vocabulary";

const NEW_DECK = "new";
const DEFAULT_DECK_NAME = "Từ vựng của tôi";

/** Một từ có sẵn thành một thẻ: hỏi chữ, đáp nghĩa, kèm cách đọc làm gợi ý (không lặp lại khi từ vốn đã là kana). */
const toDraft = (v: Vocabulary): CardDraft => ({
  front: v.word,
  back: v.meaningVi,
  hint: v.reading !== v.word ? v.reading : v.romaji,
});

export default function VocabPage() {
  const { space } = useSpace();
  const [level, setLevel] = useState(VOCAB_LEVELS[0]);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const words = useMemo(() => searchVocabulary(level, q), [level, q]);

  const decks = space.library.decks;
  // Bộ đích: bộ người học chọn nếu còn tồn tại, không thì bộ đầu tiên, chưa có bộ nào thì sẽ tự tạo "Từ vựng của tôi".
  const target = picked && decks.some((d) => d.id === picked) ? picked : (decks[0]?.id ?? NEW_DECK);
  const targetDeck = decks.find((d) => d.id === target);
  const have = useMemo(() => new Set((targetDeck?.cards ?? []).map((c) => `${c.front}\u0000${c.back}`)), [targetDeck]);
  const has = (v: Vocabulary) => have.has(`${v.word}\u0000${v.meaningVi}`);

  const add = (list: Vocabulary[]) => {
    const drafts = list.filter((v) => !has(v)).map(toDraft);
    if (drafts.length === 0) return;
    let deckId = target;
    let deckName = DEFAULT_DECK_NAME;
    let added = 0;
    const res = updateSpace((s) => {
      let next = s;
      if (deckId === NEW_DECK) {
        const r = addDeck(next, DEFAULT_DECK_NAME);
        next = r.space;
        deckId = r.deck.id;
      }
      deckName = next.library.decks.find((d) => d.id === deckId)?.name ?? DEFAULT_DECK_NAME;
      const r = addCards(next, deckId, drafts);
      added = r.added;
      return r.space;
    });
    if (!res.ok) return setMsg({ tone: "err", text: res.error });
    setPicked(deckId);
    setMsg({ tone: "ok", text: `Đã thêm ${added} từ vào “${deckName}”.` });
  };

  const addable = words.filter((v) => !has(v));

  return (
    <div className="flex flex-col gap-5">
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
        <Select label="Thêm vào bộ thẻ" value={target} onChange={(e) => setPicked(e.target.value)} className="min-w-52">
          {decks.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.cards.length})</option>)}
          {decks.length === 0 && <option value={NEW_DECK}>{DEFAULT_DECK_NAME} (tự tạo)</option>}
        </Select>
        <Button variant="outline" size="sm" disabled={addable.length === 0} onClick={() => add(addable)}>
          Thêm {addable.length} từ đang hiển thị
        </Button>
        <Link href="/thu-vien?tab=decks" className="ml-auto text-[12.5px] text-sumi-3 underline">Quản lý bộ thẻ</Link>
      </Card>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      {words.length === 0 && <Empty title="Không có từ nào khớp" hint="Thử đổi cấp độ JLPT hoặc từ khoá khác." />}

      <div className="grid gap-2.5 sm:grid-cols-2">
        {words.map((v) => (
          <Card key={v.id} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-mincho text-xl">{v.word}</span>
              {v.jlptLevel && <span className="rounded border border-rule px-1.5 text-[10.5px] text-sumi-3">N{v.jlptLevel}</span>}
            </div>
            <div className="mt-0.5 text-[12.5px] text-sumi-3">{v.reading} · {v.romaji}</div>
            <div className="mt-1 text-sm">{v.meaningVi}</div>
            {v.exampleJa && (
              <div className="mt-2 border-l-2 border-genko/40 pl-2.5 text-[12.5px] text-sumi-2">
                <div className="font-mincho">{v.exampleJa}</div>
                {v.exampleVi && <div className="text-sumi-3">{v.exampleVi}</div>}
              </div>
            )}
            <div className="mt-2.5">
              {has(v) ? (
                <span className="text-[12px] font-semibold text-genko">✓ Đã có trong bộ thẻ</span>
              ) : (
                <Button size="sm" variant="outline" onClick={() => add([v])} aria-label={`Thêm “${v.word}” vào bộ thẻ`}>＋ Thêm vào bộ thẻ</Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
