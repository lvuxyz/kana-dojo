"use client";

import { Card, Chip, Seg, Stat, Switch } from "@/components/ui";
import { ALL_GROUPS, ALL_SCRIPTS, STUDY_LIMITS, type NewOrder } from "@/lib/learning/context";
import { useStats } from "@/lib/learning/hooks";
import { MAX_DAILY_GOAL_XP, MIN_DAILY_GOAL_XP } from "@/lib/learning/state";
import { setDailyGoal } from "@/lib/learning/store";
import type { KanaGroup, Script } from "@/lib/kana";
import { useSpace } from "@/lib/space/hooks";
import { setStudy } from "@/lib/space/space";
import { updateSpace } from "@/lib/space/store";
import { NumberSetting } from "./NumberSetting";

const SCRIPT_LABEL: Record<Script, string> = { h: "ひらがな Hiragana", k: "カタカナ Katakana" };
const GROUP_LABEL: Record<KanaGroup, string> = { basic: "Cơ bản", dakuten: "Biến âm", yoon: "Âm ghép" };

const toggle = <T,>(list: readonly T[], item: T, order: readonly T[]): T[] =>
  order.filter((x) => (x === item ? !list.includes(x) : list.includes(x)));

export function StudyTab() {
  const { space } = useSpace();
  const { stats } = useStats();
  const st = space.study;
  const patch = (p: Parameters<typeof setStudy>[1]) => updateSpace((s) => setStudy(s, p));

  return (
    <div className="flex flex-col gap-5">
      <Card className="grid grid-cols-3 gap-4 px-5 py-4">
        <Stat label="Chuỗi dài nhất" value={stats.longestStreak} tone="shu" />
        <Stat label="Cấp độ" value={stats.level} tone="gold" />
        <Stat label="Bùa giữ chuỗi" value={stats.streakFreezes} sub="hồi lại mỗi thứ Hai" tone="genko" />
      </Card>

      <Card className="flex flex-col gap-5 px-5 py-4">
        <span className="label-xs">Nhịp học</span>
        <NumberSetting
          label="Mục tiêu XP mỗi ngày" suffix="XP" step={10}
          min={MIN_DAILY_GOAL_XP} max={MAX_DAILY_GOAL_XP} value={stats.dailyGoalXp}
          onCommit={setDailyGoal}
          hint="Chuỗi ngày chỉ tăng khi bạn đạt mốc này. Đặt thấp và đạt đều đặn tốt hơn đặt cao rồi bỏ."
        />
        <NumberSetting
          label="Thẻ mới mỗi ngày" suffix="thẻ"
          min={STUDY_LIMITS.newCardsPerDay.min} max={STUDY_LIMITS.newCardsPerDay.max} value={st.newCardsPerDay}
          onCommit={(n) => patch({ newCardsPerDay: n })}
          hint="0 = chỉ ôn lại thẻ đã học. Học nhiều thẻ mới thì vài ngày sau số thẻ phải ôn cũng tăng theo."
        />
        <NumberSetting
          label="Số thẻ tối đa mỗi phiên ôn" suffix="thẻ"
          min={STUDY_LIMITS.sessionSize.min} max={STUDY_LIMITS.sessionSize.max} value={st.sessionSize}
          onCommit={(n) => patch({ sessionSize: n })}
        />
        <NumberSetting
          label="Mức nhớ mục tiêu" suffix="%" step={1}
          min={STUDY_LIMITS.desiredRetention.min * 100} max={STUDY_LIMITS.desiredRetention.max * 100}
          value={Math.round(st.desiredRetention * 100)}
          onCommit={(n) => patch({ desiredRetention: n / 100 })}
          hint="Xác suất bạn còn nhớ lúc thẻ đến hạn. 90% là mức FSRS khuyến nghị; cao hơn thì nhớ chắc hơn nhưng ôn dày hơn, thấp hơn thì ôn thưa hơn nhưng quên nhiều hơn. Áp từ lần chấm thẻ kế tiếp — lịch đã hẹn không bị tính lại."
        />
      </Card>

      <Card className="flex flex-col gap-4 px-5 py-4">
        <span className="label-xs">Học gì trong phần Ôn tập</span>
        <p className="-mt-2 text-[12.5px] leading-relaxed text-sumi-3">
          Tắt một nguồn thì thẻ của nó không vào hàng đợi (lịch ôn đã lưu vẫn giữ, bật lại là tiếp tục).
        </p>
        <Switch checked={st.decks} onChange={(v) => patch({ decks: v })} label="Bộ thẻ của tôi" hint="Thẻ bạn tự soạn trong Thư viện (mỗi bộ còn có công tắc riêng)." />
        <Switch checked={st.kanaWriting} onChange={(v) => patch({ kanaWriting: v })} label="Viết kana" hint="Thẻ luyện viết Hiragana/Katakana, chấm từng nét." />
        <Switch checked={st.kanaReading} onChange={(v) => patch({ kanaReading: v })} label="Đọc kana" hint="Thẻ nhìn chữ, nhớ cách đọc." />
        <Switch checked={st.vocab} onChange={(v) => patch({ vocab: v })} label="Từ vựng JLPT có sẵn" hint="80 từ N5/N4 đóng gói sẵn. Bạn cũng có thể chỉ thêm từ mình chọn vào bộ thẻ riêng ở trang Từ vựng." />

        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-sumi">Phạm vi kana</span>
          <div className="flex flex-wrap gap-2">
            {ALL_SCRIPTS.map((sc) => (
              <Chip key={sc} active={st.kanaScripts.includes(sc)} onClick={() => patch({ kanaScripts: toggle(st.kanaScripts, sc, ALL_SCRIPTS) })}>{SCRIPT_LABEL[sc]}</Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_GROUPS.map((g) => (
              <Chip key={g} active={st.kanaGroups.includes(g)} onClick={() => patch({ kanaGroups: toggle(st.kanaGroups, g, ALL_GROUPS) })}>{GROUP_LABEL[g]}</Chip>
            ))}
          </div>
          {(st.kanaScripts.length === 0 || st.kanaGroups.length === 0) && (
            <p className="text-[12px] font-semibold text-gold">Chưa chọn bảng chữ hoặc nhóm nào nên không có thẻ kana nào được cấp.</p>
          )}
        </div>
      </Card>

      <Card className="flex flex-col gap-3 px-5 py-4">
        <span className="label-xs">Thứ tự cấp thẻ mới</span>
        <Seg<NewOrder>
          className="w-fit max-w-full overflow-x-auto"
          value={st.newOrder}
          onChange={(v) => patch({ newOrder: v })}
          options={[
            { value: "mine", label: "Thẻ của tôi trước" },
            { value: "builtin", label: "Có sẵn trước" },
            { value: "mixed", label: "Xen kẽ" },
          ]}
        />
        <p className="text-[12px] leading-relaxed text-sumi-3">
          {st.newOrder === "mine" && "Thẻ bạn soạn được cấp trước, rồi mới tới kana và từ vựng có sẵn."}
          {st.newOrder === "builtin" && "Kana và từ vựng có sẵn theo thứ tự dạy học, thẻ bạn soạn sau cùng — thẻ của bạn chỉ tới lượt khi đã học hết phần có sẵn."}
          {st.newOrder === "mixed" && "Lần lượt một thẻ từ mỗi nguồn: thẻ của bạn, viết kana, đọc kana, từ vựng…"}
        </p>
      </Card>
    </div>
  );
}
