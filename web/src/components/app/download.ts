/** Tải một đoạn văn bản về máy dưới dạng tệp (không cần máy chủ). */
export function downloadText(filename: string, text: string, type = "text/plain;charset=utf-8"): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Tên tệp an toàn từ một chuỗi tuỳ ý (tiêu đề ghi chú, tên bộ thẻ): giữ chữ Nhật/Việt, bỏ ký tự cấm của hệ điều hành. */
export function safeFileName(name: string, fallback: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").replace(/\s+/g, "-").replace(/^[.-]+|[.-]+$/g, "").slice(0, 60);
  return cleaned || fallback;
}
