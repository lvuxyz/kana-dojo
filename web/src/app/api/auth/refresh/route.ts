import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { forwardAuth, RT_COOKIE } from "@/lib/auth-proxy";

export async function POST() {
  const token = (await cookies()).get(RT_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { type: "about:blank", title: "Chưa đăng nhập", status: 401, detail: "Phiên đã hết hạn." },
      { status: 401 },
    );
  }
  return forwardAuth("refresh", { refreshToken: token });
}
