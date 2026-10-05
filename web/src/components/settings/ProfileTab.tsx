"use client";

import { useState } from "react";
import { Button, Card, Field, Notice, TextArea } from "@/components/ui";
import { useSpace } from "@/lib/space/hooks";
import { LIMITS, setProfile } from "@/lib/space/space";
import { updateSpace } from "@/lib/space/store";

export function ProfileTab() {
  const { space } = useSpace();
  const [name, setName] = useState(space.profile.name);
  const [goal, setGoal] = useState(space.profile.goal);
  const [saved, setSaved] = useState(false);

  const dirty = name.trim() !== space.profile.name || goal.trim() !== space.profile.goal;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    updateSpace((s) => setProfile(s, { name, goal }));
    setSaved(true);
  };

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col gap-2 px-5 py-4">
        <span className="label-xs">Đây là dōjō của riêng bạn</span>
        <p className="text-[13px] leading-relaxed text-sumi-2">
          Kana Dōjō không có tài khoản: ai mở trang cũng có một không gian riêng, lưu <b>ngay trong trình duyệt này</b> và
          không bao giờ rời khỏi máy bạn. Bạn chọn công cụ nào hiện ra, tự soạn tài liệu và bộ thẻ, và quyết định cách học.
          Đổi lại, nó không tự đồng bộ sang thiết bị khác và sẽ mất nếu bạn xoá dữ liệu trang web — hãy tải bản sao lưu ở tab
          <b> Dữ liệu</b> định kỳ.
        </p>
      </Card>

      <Card className="px-5 py-4">
        <form onSubmit={save} className="flex flex-col gap-4">
          <span className="label-xs">Hồ sơ</span>
          <Field
            label="Tên bạn muốn được gọi"
            value={name}
            maxLength={LIMITS.name}
            placeholder="Ví dụ: Vũ"
            autoComplete="off"
            onChange={(e) => { setName(e.target.value); setSaved(false); }}
          />
          <TextArea
            label="Vì sao bạn học tiếng Nhật? (hiện ở trang Tổng quan)"
            value={goal}
            rows={2}
            maxLength={LIMITS.goal}
            placeholder="Ví dụ: Đọc được truyện gốc · Đậu N4 tháng 12 · Đi Nhật năm sau"
            onChange={(e) => { setGoal(e.target.value); setSaved(false); }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="solid" disabled={!dirty}>Lưu hồ sơ</Button>
            {saved && !dirty && <Notice tone="ok" className="px-3 py-1.5">Đã lưu.</Notice>}
          </div>
        </form>
      </Card>
    </div>
  );
}
