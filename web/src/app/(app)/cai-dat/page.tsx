"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DataTab } from "@/components/settings/DataTab";
import { ProfileTab } from "@/components/settings/ProfileTab";
import { StudyTab } from "@/components/settings/StudyTab";
import { ToolsTab } from "@/components/settings/ToolsTab";
import { Seg, Spinner } from "@/components/ui";
import { useStats } from "@/lib/learning/hooks";
import { useSpace } from "@/lib/space/hooks";

type Tab = "profile" | "tools" | "study" | "data";
const isTab = (v: string | null): v is Tab => v === "profile" || v === "tools" || v === "study" || v === "data";

export default function SettingsPage() {
  // useSearchParams buộc phần dưới phải nằm trong Suspense khi xuất bản tĩnh.
  return (
    <Suspense fallback={<Spinner />}>
      <Settings />
    </Suspense>
  );
}

function Settings() {
  const params = useSearchParams();
  const { ready } = useStats();
  const { ready: spaceReady } = useSpace();
  // Từ Tổng quan hay Thư viện có thể trỏ thẳng tới một tab: /cai-dat?tab=tools
  const initial = params.get("tab");
  const [tab, setTab] = useState<Tab>(isTab(initial) ? initial : "profile");

  if (!ready || !spaceReady) return <Spinner />;

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <h1 className="font-mincho text-2xl font-semibold">Cài đặt</h1>

      <Seg
        className="w-full overflow-x-auto"
        value={tab}
        onChange={setTab}
        options={[
          { value: "profile", label: "Hồ sơ" },
          { value: "tools", label: "Công cụ" },
          { value: "study", label: "Cách học" },
          { value: "data", label: "Dữ liệu" },
        ]}
      />

      {tab === "profile" && <ProfileTab />}
      {tab === "tools" && <ToolsTab />}
      {tab === "study" && <StudyTab />}
      {tab === "data" && <DataTab />}
    </div>
  );
}
