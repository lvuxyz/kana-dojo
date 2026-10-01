import { ApiError } from "../api";
import type { ProblemDetail } from "../types";

/** Lỗi theo RFC 7807 giống hệt backend (ErrorTypes + ApiException), để UI xử lý không khác gì khi có server. */
const BASE = "https://kanadojo.app/errors/";

function fail(status: number, kind: string, title: string, detail: string, extra: Partial<ProblemDetail> & Record<string, unknown> = {}): ApiError {
  const problem: ProblemDetail = { type: BASE + kind, title, status, detail, ...extra };
  return new ApiError(problem);
}

export const notFound = (detail: string) => fail(404, "not-found", "Không tìm thấy", detail);
export const unauthorized = (detail: string) => fail(401, "unauthorized", "Chưa xác thực", detail);
export const conflict = (detail: string, errors: Record<string, string>) =>
  fail(409, "conflict", "Xung đột dữ liệu", detail, { errors });

/** Lỗi 400 với bản đồ lỗi theo trường; `detail` là thông báo đầu tiên (như GlobalExceptionHandler). */
export function validation(errors: Record<string, string>, detail?: string): ApiError {
  const first = Object.values(errors)[0];
  return fail(400, "validation", "Dữ liệu không hợp lệ", detail ?? first ?? "Dữ liệu gửi lên không hợp lệ", { errors });
}

export const quotaExceeded = (featureKey: string, limitValue: number, detail: string) =>
  fail(429, "quota-exceeded", "Vượt hạn mức gói cước", detail, { featureKey, limitValue });
