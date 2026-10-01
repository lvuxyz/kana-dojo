/* Hồ sơ người học trên máy này. Không có tài khoản: `id` luôn là 1, không có email hay mật khẩu. */

import { badRequest } from "../api-error";
import type { UserDto } from "../types";
import { loadState, mutate, type LocalState } from "./store";
import { safeZone } from "./time";

export const LOCAL_USER_ID = 1;

export function toUserDto(state: LocalState): UserDto {
  const p = state.profile;
  return {
    id: LOCAL_USER_ID,
    email: "",
    username: "local",
    displayName: p.displayName,
    avatarUrl: null,
    role: "USER",
    plan: "FREE",
    timezone: p.timezone,
    locale: p.locale,
    dailyGoalXp: p.dailyGoalXp,
    createdAt: p.createdAt,
  };
}

export function getUser(): UserDto {
  return toUserDto(loadState());
}

export interface ProfilePatch { displayName?: string; timezone?: string; dailyGoalXp?: number; locale?: string }

/** Cùng luật kiểm tra với UpdateProfileRequest / AuthService.updateProfile ở backend. */
export function updateProfile(patch: ProfilePatch): UserDto {
  return mutate((state) => {
    const p = state.profile;
    if (patch.displayName !== undefined) {
      const name = patch.displayName.trim();
      if (name.length > 64) throw badRequest("Tên hiển thị tối đa 64 ký tự", { displayName: "Tên hiển thị tối đa 64 ký tự" });
      if (name) p.displayName = name;
    }
    if (patch.timezone !== undefined && patch.timezone.trim()) {
      const zone = safeZone(patch.timezone.trim(), "");
      if (!zone) throw badRequest("Múi giờ không hợp lệ", { timezone: "Múi giờ không hợp lệ, ví dụ hợp lệ: Asia/Ho_Chi_Minh" });
      p.timezone = zone;
    }
    if (patch.dailyGoalXp !== undefined && patch.dailyGoalXp !== null) {
      if (!Number.isFinite(patch.dailyGoalXp) || patch.dailyGoalXp < 10) throw badRequest("Mục tiêu ngày tối thiểu là 10 XP", { dailyGoalXp: "Mục tiêu ngày tối thiểu là 10 XP" });
      if (patch.dailyGoalXp > 5000) throw badRequest("Mục tiêu ngày tối đa là 5000 XP", { dailyGoalXp: "Mục tiêu ngày tối đa là 5000 XP" });
      p.dailyGoalXp = Math.round(patch.dailyGoalXp);
    }
    if (patch.locale !== undefined && patch.locale.trim()) {
      if (patch.locale.trim().length > 8) throw badRequest("Mã ngôn ngữ không hợp lệ", { locale: "Mã ngôn ngữ không hợp lệ" });
      p.locale = patch.locale.trim();
    }
    return toUserDto(state);
  });
}
