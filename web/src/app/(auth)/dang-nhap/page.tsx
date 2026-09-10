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
    <Card variant="luxury" className="flex flex-col gap-5 px-7 py-8 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mincho text-2xl font-bold text-sumi">Đăng nhập</h1>
          <p className="mt-1 text-sm font-medium text-sumi-3">
            Tiếp tục chuỗi ngày rèn luyện của bạn.
          </p>
        </div>
        <span className="hanko-seal px-2 py-0.5 text-xs">
          道場
        </span>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field
          label="Email hoặc tên đăng nhập"
          value={id}
          onChange={(e) => setId(e.target.value)}
          autoComplete="username"
          required
        />
        <Field
          label="Mật khẩu"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="current-password"
          required
        />
        {err && (
          <p className="rounded-xl border border-shu/30 bg-shu-tint px-3.5 py-2.5 text-[13px] font-semibold text-shu-2">
            {err}
          </p>
        )}
        <Button type="submit" variant="solid" size="lg" disabled={busy} className="mt-1 shadow-md shadow-shu/25">
          {busy ? "Đang xác thực…" : "Đăng nhập vào Dōjō"}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs font-semibold text-sumi-3 uppercase tracking-wider">
        <span className="h-px flex-1 bg-rule/70" />
        hoặc
        <span className="h-px flex-1 bg-rule/70" />
      </div>

      <GoogleButton label="Đăng nhập nhanh với Google" />

      <p className="text-center text-[13.5px] font-medium text-sumi-3 pt-1">
        Chưa có tài khoản?{" "}
        <Link href="/dang-ky" className="font-semibold text-shu hover:underline">
          Đăng ký miễn phí
        </Link>
      </p>
    </Card>
  );
}
