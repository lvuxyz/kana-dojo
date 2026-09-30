/* ĐANG TẮT — client đồng bộ luyện gõ lên máy chủ (TypingController). Web hiện chạy với dữ liệu trên máy
 * người dùng nên phần này được giữ lại dưới dạng comment. Bật lại cùng lúc với backend: bỏ comment file này
 * và hai dòng có đánh dấu trong app/(app)/luyen-go/page.tsx — xem docs/TYPING.md, mục "Mã đồng bộ máy chủ (đang tắt)". */

// import { get, post } from "@/lib/api";
// import type { InputMethod } from "./engine";
// import type { ContentType } from "./phrases";
// import type { TypingMode } from "./score";
//
// /* Hợp đồng với TypingController (POST /api/v1/typing/sessions, GET /api/v1/typing/stats). */
//
// export interface TypingSessionRequest {
//   inputMethod: InputMethod;
//   contentType: ContentType;
//   mode: TypingMode;
//   durationMs: number;
//   correctKeys: number;
//   missKeys: number;
//   charsTyped: number;
//   phrasesCompleted: number;
// }
//
// export interface TypingResultDto {
//   sessionId: number;
//   score: number;
//   kpm: number;
//   accuracy: number;
//   xpEarned: number;
//   personalBest: number;
//   newBest: boolean;
// }
//
// export interface TypingBestDto {
//   inputMethod: InputMethod;
//   contentType: ContentType;
//   mode: TypingMode;
//   bestScore: number;
//   bestKpm: number;
//   bestAccuracy: number;
//   plays: number;
//   lastPlayedAt: string;
// }
//
// export interface TypingSessionDto {
//   id: number;
//   inputMethod: InputMethod;
//   contentType: ContentType;
//   mode: TypingMode;
//   score: number;
//   kpm: number;
//   accuracy: number;
//   durationMs: number;
//   createdAt: string;
// }
//
// export interface TypingStatsDto {
//   totalSessions: number;
//   totalDurationMs: number;
//   bests: TypingBestDto[];
//   recent: TypingSessionDto[];
// }
//
// /** Kết quả một ván, rút gọn đúng những gì server cần (khớp GameResult của useTypingGame). */
// export interface FinishedRun {
//   config: { method: InputMethod; content: ContentType; mode: TypingMode };
//   durationMs: number;
//   correctKeys: number;
//   missKeys: number;
//   charsTyped: number;
//   phrasesCompleted: number;
// }
//
// /** Chỉ gửi số đo thô: server tự tính lại điểm, không tin điểm client. */
// export function toSessionRequest(r: FinishedRun): TypingSessionRequest {
//   return {
//     inputMethod: r.config.method,
//     contentType: r.config.content,
//     mode: r.config.mode,
//     durationMs: r.durationMs,
//     correctKeys: r.correctKeys,
//     missKeys: r.missKeys,
//     charsTyped: r.charsTyped,
//     phrasesCompleted: r.phrasesCompleted,
//   };
// }
//
// /** Server từ chối lượt dưới 1 giây hoặc chưa có phím đúng nào; lượt luyện lại câu có lỗi cũng không gửi. */
// export function shouldUpload(r: FinishedRun, practice: boolean): boolean {
//   return !practice && r.correctKeys > 0 && r.durationMs >= 1000;
// }
//
// export function uploadSession(r: FinishedRun): Promise<TypingResultDto> {
//   return post<TypingResultDto>("/typing/sessions", toSessionRequest(r));
// }
//
// export function fetchTypingStats(): Promise<TypingStatsDto> {
//   return get<TypingStatsDto>("/typing/stats");
// }

export {};
