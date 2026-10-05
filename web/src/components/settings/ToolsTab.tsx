"use client";

import { Card } from "@/components/ui";
import { MODULE_INFO, WIDGET_INFO } from "@/lib/space/modules";
import { useSpace } from "@/lib/space/hooks";
import { LOCKED_MODULES, MODULE_IDS, WIDGET_IDS, setModules, setWidgets } from "@/lib/space/space";
import { updateSpace } from "@/lib/space/store";
import { ReorderList, type ReorderItem } from "./ReorderList";

const MODULE_ITEMS: ReorderItem<(typeof MODULE_IDS)[number]>[] = MODULE_IDS.map((id) => ({
  id,
  label: MODULE_INFO[id].label,
  blurb: MODULE_INFO[id].blurb,
  locked: LOCKED_MODULES.includes(id),
}));

const WIDGET_ITEMS: ReorderItem<(typeof WIDGET_IDS)[number]>[] = WIDGET_IDS.map((id) => ({ id, ...WIDGET_INFO[id] }));

export function ToolsTab() {
  const { space } = useSpace();
  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col gap-3 px-5 py-4">
        <span className="label-xs">Công cụ trên thanh điều hướng</span>
        <p className="text-[12.5px] leading-relaxed text-sumi-3">
          Bật công cụ bạn dùng, tắt cái không cần, và xếp theo thứ tự bạn muốn. Tắt một công cụ chỉ ẩn nó khỏi thanh điều hướng —
          dữ liệu và tiến độ của nó vẫn được giữ nguyên.
        </p>
        <ReorderList all={MODULE_ITEMS} enabled={space.modules} onChange={(next) => updateSpace((s) => setModules(s, next))} />
      </Card>

      <Card className="flex flex-col gap-3 px-5 py-4">
        <span className="label-xs">Các khối ở trang Tổng quan</span>
        <p className="text-[12.5px] leading-relaxed text-sumi-3">Chọn khối nào hiện và thứ tự từ trên xuống.</p>
        <ReorderList all={WIDGET_ITEMS} enabled={space.home.widgets} onChange={(next) => updateSpace((s) => setWidgets(s, next))} />
      </Card>
    </div>
  );
}
