"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Field } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { GoogleButton } from "@/components/app/GoogleButton";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(id, pw);
      router.push("/bang-dieu-khien");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Đăng nhập không thành công");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-col gap-5 px-6 py-7">
      <div>
        <h1 className="font-mincho text-2xl font-semibold">Đăng nhập</h1>
        <p className="mt-1 text-sm text-sumi-3">Tiếp tục chuỗi ngày học của bạn.</p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Email hoặc tên đăng nhập" value={id} onChange={(e) => setId(e.target.value)}
               autoComplete="username" required />
        <Field label="Mật khẩu" type="password" value={pw} onChange={(e) => setPw(e.target.value)}
               autoComplete="current-password" required />
        {err && <p className="rounded-lg border border-shu/30 bg-shu-tint px-3 py-2 text-[13px] text-shu-2">{err}</p>}
        <Button type="submit" variant="solid" size="lg" disabled={busy}>
          {busy ? "Đang đăng nhập…" : "Đăng nhập"}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-[11px] text-sumi-3">
        <span className="h-px flex-1 bg-rule" />hoặc<span className="h-px flex-1 bg-rule" />
      </div>

      <GoogleButton label="Đăng nhập với Google" />

      <p className="text-center text-[13px] text-sumi-3">
        Chưa có tài khoản? <Link href="/dang-ky" className="text-shu hover:underline">Đăng ký miễn phí</Link>
      </p>
    </Card>
  );
}
