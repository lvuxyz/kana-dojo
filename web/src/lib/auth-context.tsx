"use client";

/* CHẾ ĐỘ CÁ NHÂN (tạm thời) — xem docs/LOCAL_MODE.md.
   Không có tài khoản: mỗi trình duyệt là một người học, hồ sơ nằm trong localStorage (lib/local/profile.ts).
   `user` luôn có giá trị sau khi trang nạp xong, nên khung ứng dụng không còn đẩy ai về trang đăng nhập.
   Phần đăng nhập/đăng ký/Google/đăng xuất qua BFF được giữ dưới dạng comment (`[máy chủ — đang tắt]`). */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getUser } from "./local/profile";
import { resetState } from "./local/store";
// [máy chủ — đang tắt] import { useRouter } from "next/navigation";
// [máy chủ — đang tắt] import { setAccessToken } from "./api";
import type { UserDto } from "./types";

interface AuthState {
  user: UserDto | null;
  /** true trong lúc nạp hồ sơ từ localStorage khi tải trang */
  loading: boolean;
  /** Nạp lại hồ sơ sau khi sửa (đổi múi giờ, mục tiêu ngày…). */
  reloadUser: () => void;
  /** Xoá toàn bộ dữ liệu học tập trên máy này rồi nạp lại trang. */
  resetData: () => void;
  // [máy chủ — đang tắt] login: (emailOrUsername: string, password: string) => Promise<void>;
  // [máy chủ — đang tắt] register: (input: RegisterInput) => Promise<void>;
  // [máy chủ — đang tắt] loginWithGoogle: (idToken: string) => Promise<void>;
  // [máy chủ — đang tắt] logout: () => Promise<void>;
}

// [máy chủ — đang tắt] export interface RegisterInput {
// [máy chủ — đang tắt]   email: string; username: string; password: string; displayName: string;
// [máy chủ — đang tắt] }

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);

  // localStorage chỉ có ở trình duyệt nên hồ sơ được nạp sau khi mount (tránh lệch hydrate).
  useEffect(() => {
    setUser(getUser());
    setLoading(false);
  }, []);

  const reloadUser = useCallback(() => setUser(getUser()), []);

  const resetData = useCallback(() => {
    resetState();
    window.location.assign("/bang-dieu-khien");
  }, []);

  return <Ctx.Provider value={{ user, loading, reloadUser, resetData }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth phải nằm trong <AuthProvider>");
  return v;
}

// -----------------------------------------------------------------------------
//   [máy chủ — đang tắt] Bản gốc: khôi phục phiên bằng cookie refresh qua BFF, đăng nhập/đăng ký/Google/đăng xuất.
//
// async function callAuth(path: string, body?: unknown) {
//   const res = await fetch(`/api/auth/${path}`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: body ? JSON.stringify(body) : undefined,
//   });
//   const data = await res.json().catch(() => null);
//   if (!res.ok) throw new Error(data?.detail || data?.title || "Đăng nhập không thành công");
//   return data as { accessToken: string; user: UserDto };
// }
//
// export function AuthProvider({ children }: { children: React.ReactNode }) {
//   const [user, setUser] = useState<UserDto | null>(null);
//   const [loading, setLoading] = useState(true);
//   const router = useRouter();
//
//   // Khôi phục phiên: cookie refresh là httpOnly nên chỉ có server đọc được,
//   // client phải hỏi qua route handler mới biết mình còn đăng nhập hay không.
//   useEffect(() => {
//     let alive = true;
//     (async () => {
//       try {
//         const data = await callAuth("refresh");
//         if (!alive) return;
//         setAccessToken(data.accessToken);
//         setUser(data.user);
//       } catch {
//         if (alive) setAccessToken(null);
//       } finally {
//         if (alive) setLoading(false);
//       }
//     })();
//     return () => { alive = false; };
//   }, []);
//
//   const finish = useCallback((data: { accessToken: string; user: UserDto }) => {
//     setAccessToken(data.accessToken);
//     setUser(data.user);
//   }, []);
//
//   const value: AuthState = {
//     user,
//     loading,
//     login: async (emailOrUsername, password) => finish(await callAuth("login", { emailOrUsername, password })),
//     register: async (input) => finish(await callAuth("register", input)),
//     loginWithGoogle: async (idToken) => finish(await callAuth("google", { idToken })),
//     logout: async () => {
//       await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
//       setAccessToken(null);
//       setUser(null);
//       router.push("/");
//     },
//   };
//
//   return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
// }
//   -----------------------------------------------------------------------------
