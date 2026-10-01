import { afterEach, describe, expect, it, vi } from "vitest";
import { getAccessToken, refreshSession, setAccessToken } from "./api";

const user = { id: 1, email: "a@b.c", username: "abc", displayName: "A", avatarUrl: null, role: "USER", plan: "FREE",
  timezone: "Asia/Ho_Chi_Minh", locale: "vi", dailyGoalXp: 50, createdAt: "2026-09-07T00:00:00Z" };

afterEach(async () => {
  vi.unstubAllGlobals();
  setAccessToken(null);
  await new Promise((r) => setTimeout(r, 5)); // để cửa sổ gộp request của lần trước đóng lại
});

describe("refreshSession — gộp các lần làm mới phiên", () => {
  it("nhiều lời gọi đồng thời chỉ bắn đúng một request", async () => {
    // Lỗi gốc: StrictMode gọi refresh hai lần cùng cookie → backend coi là tái sử dụng token và thu hồi cả phiên.
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ accessToken: "tok", expiresIn: 900, user }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const [a, b, c] = await Promise.all([refreshSession(), refreshSession(), refreshSession()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/refresh", { method: "POST" });
    expect(a).toEqual({ accessToken: "tok", expiresIn: 900, user });
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(getAccessToken()).toBe("tok");
  });

  it("sau khi xong thì lần gọi kế tiếp bắn request mới (không kẹt kết quả cũ)", async () => {
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ accessToken: `tok${++calls}`, user }), { status: 200 })));

    expect((await refreshSession())!.accessToken).toBe("tok1");
    await new Promise((r) => setTimeout(r, 5));
    expect((await refreshSession())!.accessToken).toBe("tok2");
    expect(calls).toBe(2);
  });

  it("chưa đăng nhập (401) trả null cho mọi bên chờ và không đặt token", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    const results = await Promise.all([refreshSession(), refreshSession()]);

    expect(results).toEqual([null, null]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
  });

  it("lỗi mạng cũng trả null thay vì ném", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    expect(await refreshSession()).toBeNull();
  });
});
