import { loadLocal } from "./standalone";
import type { ProblemDetail, UserDto } from "./types";

/** Access token chỉ nằm trong RAM của tab — không đưa vào localStorage để
 *  XSS không đọc trộm được. Refresh token nằm trong cookie httpOnly do route
 *  handler của Next đặt, JavaScript không chạm tới. */
let accessToken: string | null = null;
let refreshing: Promise<RefreshedSession | null> | null = null;

export interface RefreshedSession { accessToken: string; user: UserDto }

export function setAccessToken(t: string | null) { accessToken = t; }
export function getAccessToken() { return accessToken; }

export class ApiError extends Error {
  constructor(public problem: ProblemDetail) {
    super(problem.detail || problem.title);
    this.name = "ApiError";
  }
  get status() { return this.problem.status; }
  get fieldErrors() { return this.problem.errors ?? {}; }
}

async function toError(res: Response): Promise<ApiError> {
  let problem: ProblemDetail;
  try {
    problem = await res.json();
    if (typeof problem?.status !== "number") throw new Error();
  } catch {
    problem = {
      type: "about:blank",
      title: "Lỗi kết nối",
      status: res.status,
      detail: res.status === 0 ? "Không kết nối được máy chủ." : `Máy chủ trả về ${res.status}.`,
    };
  }
  return new ApiError(problem);
}

/** Làm mới phiên bằng cookie refresh. Gom MỌI lời gọi đồng thời vào một request duy nhất — kể cả việc
 *  khôi phục phiên lúc tải trang của AuthProvider — nếu không thì chúng bắn nhiều lần refresh cùng một cookie
 *  và backend (xoay vòng token + phát hiện tái sử dụng) thu hồi cả family, đăng xuất người dùng.
 *  Ví dụ: React StrictMode chạy effect hai lần ở `next dev`, hay 5 truy vấn cùng gặp 401. */
export function refreshSession(): Promise<RefreshedSession | null> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        let data: RefreshedSession;
        if (loadLocal) {
          const { localAuth } = await loadLocal();
          data = await localAuth("refresh");
        } else {
          const res = await fetch("/api/auth/refresh", { method: "POST" });
          if (!res.ok) return null;
          data = (await res.json()) as RefreshedSession;
        }
        accessToken = data.accessToken;
        return data;
      } catch {
        return null;
      } finally {
        // Giữ promise đã xong thêm một nhịp để các lời gọi sát nhau vẫn dùng chung kết quả.
        setTimeout(() => { refreshing = null; }, 0);
      }
    })();
  }
  return refreshing;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Bỏ qua vòng thử lại sau khi refresh (dùng cho chính endpoint auth) */
  noRetry?: boolean;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, noRetry, headers, ...rest } = opts;

  // Chế độ độc lập: backend chạy ngay trong trình duyệt, không có request mạng nào.
  if (loadLocal) {
    const { localRequest } = await loadLocal();
    return localRequest<T>(path, rest.method ?? "GET", body);
  }

  const send = (token: string | null) =>
    fetch(`/api/v1${path}`, {
      ...rest,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await send(accessToken);

  if (res.status === 401 && !noRetry) {
    const fresh = await refreshSession();
    if (fresh) res = await send(fresh.accessToken);
  }

  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const get = <T,>(path: string) => api<T>(path);
export const post = <T,>(path: string, body?: unknown) => api<T>(path, { method: "POST", body });
export const patch = <T,>(path: string, body?: unknown) => api<T>(path, { method: "PATCH", body });
