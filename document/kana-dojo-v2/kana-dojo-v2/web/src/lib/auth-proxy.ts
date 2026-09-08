import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8080";
export const RT_COOKIE = "kd_rt";

/** Gọi backend rồi tách đôi kết quả: refresh token đi vào cookie httpOnly,
 *  access token trả về cho client giữ trong RAM. Trình duyệt không bao giờ
 *  thấy refresh token bằng JavaScript. */
export async function forwardAuth(path: string, payload: unknown) {
  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND}/api/v1/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { type: "about:blank", title: "Không kết nối được máy chủ", status: 503,
        detail: "Máy chủ đang không phản hồi. Thử lại sau ít phút." },
      { status: 503 },
    );
  }

  const data = await upstream.json().catch(() => null);
  if (!upstream.ok || !data?.accessToken) {
    return NextResponse.json(data ?? { title: "Lỗi", status: upstream.status, detail: "" },
      { status: upstream.status });
  }

  const res = NextResponse.json({ accessToken: data.accessToken, expiresIn: data.expiresIn, user: data.user });
  res.cookies.set(RT_COOKIE, data.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
