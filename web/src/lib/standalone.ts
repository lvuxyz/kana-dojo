/** Chế độ độc lập (tạm thời): chạy web mà không cần backend/PostgreSQL. Mọi lời gọi `/api/v1/*`
 *  và `/api/auth/*` được xử lý ngay trong trình duyệt bởi `lib/local/` (dữ liệu nội dung đóng gói
 *  sẵn, tiến độ lưu bằng localStorage) nên toàn bộ trang và chức năng vẫn hoạt động.
 *
 *  Bật bằng `NEXT_PUBLIC_STANDALONE=true`; đổi giá trị phải khởi động lại `next dev` vì biến
 *  NEXT_PUBLIC_* được ghi cứng lúc biên dịch.
 *
 *  `loadLocal` là NULL khi tắt cờ. Điều kiện phải viết thẳng `process.env.NEXT_PUBLIC_STANDALONE === "true"`
 *  tại chính chỗ bọc `import()`: webpack ghi cứng biến này lúc build rồi loại nhánh chết, nên khi tắt cờ
 *  chunk `lib/local` không được sinh ra. Nếu đọc cờ qua một biến export từ module khác thì không loại được. */
export const loadLocal = process.env.NEXT_PUBLIC_STANDALONE === "true" ? () => import("./local") : null;
