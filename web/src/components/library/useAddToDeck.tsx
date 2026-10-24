"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Select } from "@/components/ui";
import { addCards, addDeck, type CardDraft } from "@/lib/space/library";
import { useSpace } from "@/lib/space/hooks";
import { updateSpace } from "@/lib/space/store";

/* Thêm nội dung có sẵn (từ vựng, kanji) vào một bộ thẻ của người học. Dùng chung cho trang Từ vựng và trang Kanji. */

const NEW_DECK = "new";

export type AddMsg = { tone: "ok" | "err"; text: string };

/** `defaultName`: tên bộ tự tạo khi người học chưa có bộ nào. `unit`: danh từ đếm trong thông báo ("từ", "thẻ"). */
export function useAddToDeck(defaultName: string, unit = "thẻ") {
  const { space } = useSpace();
  const [picked, setPicked] = useState<string | null>(null);

  const decks = space.library.decks;
  // Bộ đích: bộ người học chọn nếu còn tồn tại, không thì bộ đầu tiên, chưa có bộ nào thì sẽ tự tạo bộ `defaultName`.
  const target = picked && decks.some((d) => d.id === picked) ? picked : (decks[0]?.id ?? NEW_DECK);
  const targetDeck = decks.find((d) => d.id === target);
  const have = useMemo(() => new Set((targetDeck?.cards ?? []).map((c) => `${c.front}\u0000${c.back}`)), [targetDeck]);
  const has = (d: CardDraft) => have.has(`${d.front}\u0000${d.back}`);

  /** Thêm các thẻ chưa có trong bộ đích; trả thông báo để hiển thị (null khi không có gì để thêm). */
  const add = (list: readonly CardDraft[]): AddMsg | null => {
    const drafts = list.filter((d) => !has(d));
    if (drafts.length === 0) return null;
    let deckId = target;
    let deckName = defaultName;
    let added = 0;
    const res = updateSpace((s) => {
      let next = s;
      if (deckId === NEW_DECK) {
        const r = addDeck(next, defaultName);
        next = r.space;
        deckId = r.deck.id;
      }
      deckName = next.library.decks.find((d) => d.id === deckId)?.name ?? defaultName;
      const r = addCards(next, deckId, drafts);
      added = r.added;
      return r.space;
    });
    if (!res.ok) return { tone: "err", text: res.error };
    setPicked(deckId);
    return { tone: "ok", text: `Đã thêm ${added} ${unit} vào “${deckName}”.` };
  };

  const picker = (
    <Select label="Thêm vào bộ thẻ" value={target} onChange={(e) => setPicked(e.target.value)} className="min-w-52">
      {decks.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.cards.length})</option>)}
      {decks.length === 0 && <option value={NEW_DECK}>{defaultName} (tự tạo)</option>}
    </Select>
  );

  return { has, add, picker };
}

export function ManageDecksLink() {
  return <Link href="/thu-vien?tab=decks" className="ml-auto text-[12.5px] text-sumi-3 underline">Quản lý bộ thẻ</Link>;
}
