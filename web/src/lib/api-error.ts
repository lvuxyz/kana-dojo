import type { ProblemDetail } from "./types";

/** Lỗi theo RFC 7807 — cùng hình dạng với phản hồi lỗi của backend để giao diện chỉ cần một cách xử lý. */
export class ApiError extends Error {
  constructor(public problem: ProblemDetail) {
    super(problem.detail || problem.title);
    this.name = "ApiError";
  }
  get status() { return this.problem.status; }
  get fieldErrors() { return this.problem.errors ?? {}; }
}

const BASE = "https://kanadojo.app/errors/";

export function notFound(detail: string): ApiError {
  return new ApiError({ type: `${BASE}not-found`, title: "Không tìm thấy", status: 404, detail });
}

export function badRequest(detail: string, errors?: Record<string, string>): ApiError {
  return new ApiError({ type: `${BASE}validation`, title: "Dữ liệu không hợp lệ", status: 400, detail, errors });
}
