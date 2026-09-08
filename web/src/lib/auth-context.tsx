"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setAccessToken } from "./api";
import type { UserDto } from "./types";

interface AuthState {
  user: UserDto | null;
  /** true trong lúc thử khôi phục phiên từ cookie khi tải trang */
  loading: boolean;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

export interface RegisterInput {
  email: string; username: string; password: string; displayName: string;
}

const Ctx = createContext<AuthState | null>(null);

async function callAuth(path: string, body?: unknown) {
  const res = await fetch(`/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || data?.title || "Đăng nhập không thành công");
  return data as { accessToken: string; user: UserDto };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Khôi phục phiên: cookie refresh là httpOnly nên chỉ có server đọc được,
  // client phải hỏi qua route handler mới biết mình còn đăng nhập hay không.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await callAuth("refresh");
        if (!alive) return;
        setAccessToken(data.accessToken);
        setUser(data.user);
      } catch {
        if (alive) setAccessToken(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const finish = useCallback((data: { accessToken: string; user: UserDto }) => {
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const value: AuthState = {
    user,
    loading,
    login: async (emailOrUsername, password) => finish(await callAuth("login", { emailOrUsername, password })),
    register: async (input) => finish(await callAuth("register", input)),
    loginWithGoogle: async (idToken) => finish(await callAuth("google", { idToken })),
    logout: async () => {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      setAccessToken(null);
      setUser(null);
      router.push("/");
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth phải nằm trong <AuthProvider>");
  return v;
}
