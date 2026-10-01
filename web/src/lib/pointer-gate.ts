/* Cổng chọn con trỏ cho khung viết: tại mỗi thời điểm chỉ MỘT con trỏ được phép viết.
   Thuần hàm/không DOM nên test được bằng Node (pointer-gate.test.ts).

   Vì sao cần: khung viết từng nhận mọi sự kiện con trỏ như thể chỉ có một ngón. Trên điện thoại/máy tính bảng
   thì lòng bàn tay hoặc ngón thứ hai chạm vào giữa nét sẽ ghi đè nét đang viết (sự kiện `pointerdown` thứ hai đặt
   lại danh sách điểm), điểm của hai con trỏ bị trộn vào một nét, và `pointercancel` (hệ điều hành giành lại cử chỉ)
   bị coi như người học đã nhấc tay nên nét dở dang vẫn bị chấm. */

export type PointerKind = "mouse" | "touch" | "pen";

export interface PointerDown {
  id: number;
  kind: PointerKind;
  /** Nút bấm: chuột phải/giữa không được viết. Với cảm ứng và bút là 0. */
  button: number;
}

/** - `start`: bắt đầu một nét mới.
 *  - `restart`: bỏ nét đang dở của con trỏ trước và viết lại bằng con trỏ này (bút thắng lòng bàn tay).
 *  - `ignore`: bỏ qua hoàn toàn. */
export type DownVerdict = "start" | "restart" | "ignore";

export function pointerKind(type: string): PointerKind {
  return type === "touch" || type === "pen" ? type : "mouse"; // pointerType rỗng/lạ coi như chuột
}

export function createPointerGate() {
  let active: { id: number; kind: PointerKind } | null = null;

  return {
    /** Con trỏ đang được phép viết, hoặc null. */
    get activeId(): number | null {
      return active ? active.id : null;
    },

    down(p: PointerDown): DownVerdict {
      if (p.kind === "mouse" && p.button !== 0) return "ignore";
      if (!active) {
        active = { id: p.id, kind: p.kind };
        return "start";
      }
      // Cùng một con trỏ xuống lần nữa nghĩa là sự kiện `up` trước đó đã thất lạc: viết lại cho khỏi kẹt.
      if (active.id === p.id) return "restart";
      // Khi cầm bút, lòng bàn tay thường chạm xuống trước: bút được ưu tiên hơn cảm ứng đang viết dở.
      if (p.kind === "pen" && active.kind === "touch") {
        active = { id: p.id, kind: p.kind };
        return "restart";
      }
      return "ignore"; // ngón thứ hai, lòng bàn tay chạm sau, chuột khi đang có bút…
    },

    /** Sự kiện di chuyển này có thuộc con trỏ đang viết không? */
    move(id: number): boolean {
      return active !== null && active.id === id;
    },

    /** Con trỏ nhấc lên: true nếu đó chính là con trỏ đang viết (nét hoàn tất, đáng để chấm). */
    up(id: number): boolean {
      if (!active || active.id !== id) return false;
      active = null;
      return true;
    },

    /** Hệ điều hành huỷ cử chỉ (`pointercancel`) hoặc mất quyền bắt con trỏ: true nếu phải bỏ nét dở, KHÔNG chấm. */
    cancel(id: number): boolean {
      return this.up(id);
    },

    /** Dùng khi đổi chữ / xoá làm lại, để trạng thái cũ không chặn nét mới. */
    reset(): void {
      active = null;
    },
  };
}
