import type { ProblemDetail } from "./types";

/** Access token chỉ nằm trong RAM của tab — không đưa vào localStorage để
 *  XSS không đọc trộm được. Refresh token nằm trong cookie httpOnly do route
 *  handler của Next đặt, JavaScript không chạm tới. */
let accessToken: string | null = null;
let refreshing: Promise<string | null> | null = null;

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

/** Làm mới token. Gom nhiều lời gọi đồng thời vào một request duy nhất, nếu
 *  không thì 5 truy vấn hết hạn cùng lúc sẽ bắn 5 lần refresh và xoay vòng
 *  token loạn lên (backend thu hồi cả family khi thấy token dùng lại). */
async function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST" });
        if (!res.ok) return null;
        const data = (await res.json()) as { accessToken: string };
        accessToken = data.accessToken;
        return accessToken;
      } catch {
        return null;
      } finally {
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
    const fresh = await refreshAccessToken();
    if (fresh) res = await send(fresh);
  }

  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const get = <T,>(path: string) => api<T>(path);
export const post = <T,>(path: string, body?: unknown) => api<T>(path, { method: "POST", body });
export const patch = <T,>(path: string, body?: unknown) => api<T>(path, { method: "PATCH", body });
