import type { StudyOptions } from "../learning/context";
import { completeOnboarding, setModules, setProfile, setStudy, type ModuleId, type Space } from "./space";

/* Điểm xuất phát ở màn dựng không gian lần đầu. Chỉ là cấu hình sẵn: người học đổi được từng mục sau trong Cài đặt. */

export type PresetId = "full" | "kana" | "mine";

export interface Preset {
  id: PresetId;
  label: string;
  blurb: string;
  modules: readonly ModuleId[];
  study: Partial<StudyOptions>;
}

export const PRESETS: readonly Preset[] = [
  {
    id: "full",
    label: "Học đầy đủ",
    blurb: "Dùng mọi công cụ: tập viết, ôn thẻ, luyện gõ, từ vựng, quiz và thư viện của bạn.",
    modules: ["home", "review", "writing", "library", "typing", "vocab", "quiz", "settings"],
    study: {},
  },
  {
    id: "kana",
    label: "Chỉ tập viết kana",
    blurb: "Gọn nhẹ: viết Hiragana/Katakana và ôn lại theo lịch. Bật thêm công cụ lúc nào bạn muốn.",
    modules: ["home", "writing", "review", "settings"],
    study: { vocab: false },
  },
  {
    id: "mine",
    label: "Tự soạn từ trang trắng",
    blurb: "Bắt đầu trống: bạn viết ghi chú, tự soạn thẻ và câu luyện gõ. Nội dung có sẵn được tắt (bật lại trong Cài đặt).",
    modules: ["home", "library", "review", "typing", "settings"],
    study: { kanaWriting: false, kanaReading: false, vocab: false },
  },
];

export const findPreset = (id: PresetId): Preset => PRESETS.find((p) => p.id === id) ?? PRESETS[0];

/** Áp một điểm xuất phát lên không gian và đánh dấu đã dựng xong. */
export function applyPreset(space: Space, id: PresetId, name: string): Space {
  const preset = findPreset(id);
  return completeOnboarding(setStudy(setModules(setProfile(space, { name }), preset.modules), preset.study));
}
