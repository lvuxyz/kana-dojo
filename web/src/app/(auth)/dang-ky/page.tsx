"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Field } from "@/components/ui";
import { GoogleButton } from "@/components/app/GoogleButton";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [f, setF] = useState({ displayName: "", username: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.password.length < 8) { setErr("Mật khẩu cần ít nhất 8 ký tự."); return; }
    setErr(""); setBusy(true);
    try {
      await register(f);
      router.push("/bang-dieu-khien");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Đăng ký không thành công");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-col gap-5 px-6 py-7">
      <div>
        <h1 className="font-mincho text-2xl font-semibold">Tạo tài khoản</h1>
        <p className="mt-1 text-sm text-sumi-3">Miễn phí. Toàn bộ 208 ký tự Kana không giới hạn.</p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Tên hiển thị" value={f.displayName} onChange={set("displayName")} required maxLength={64} />
        <Field label="Tên đăng nhập" value={f.username} onChange={set("username")} required
               pattern="[a-zA-Z0-9_]{3,32}" title="3–32 ký tự: chữ, số hoặc dấu gạch dưới" autoComplete="username" />
        <Field label="Email" type="email" value={f.email} onChange={set("email")} required autoComplete="email" />
        <Field label="Mật khẩu" type="password" value={f.password} onChange={set("password")} required
               minLength={8} autoComplete="new-password" />
        {err && <p className="rounded-lg border border-shu/30 bg-shu-tint px-3 py-2 text-[13px] text-shu-2">{err}</p>}
        <Button type="submit" variant="solid" size="lg" disabled={busy}>
          {busy ? "Đang tạo tài khoản…" : "Đăng ký"}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-[11px] text-sumi-3">
        <span className="h-px flex-1 bg-rule" />hoặc<span className="h-px flex-1 bg-rule" />
      </div>

      <GoogleButton label="Đăng ký với Google" />

      <p className="text-center text-[13px] text-sumi-3">
        Đã có tài khoản? <Link href="/dang-nhap" className="text-shu hover:underline">Đăng nhập</Link>
      </p>
    </Card>
  );
}
