import { describe, expect, it } from "vitest";
import { createPointerGate, pointerKind } from "./pointer-gate";

const touch = (id: number) => ({ id, kind: "touch" as const, button: 0 });
const pen = (id: number) => ({ id, kind: "pen" as const, button: 0 });
const mouse = (id: number, button = 0) => ({ id, kind: "mouse" as const, button });

describe("cổng con trỏ", () => {
  it("một con trỏ viết bình thường: down → move → up", () => {
    const g = createPointerGate();
    expect(g.down(mouse(1))).toBe("start");
    expect(g.move(1)).toBe(true);
    expect(g.up(1)).toBe(true);
    expect(g.activeId).toBeNull();
    expect(g.up(1)).toBe(false); // nhấc lần hai không còn nét nào để chấm
  });

  it("ngón thứ hai / lòng bàn tay chạm giữa nét bị bỏ qua và không phá nét đang viết", () => {
    const g = createPointerGate();
    expect(g.down(touch(10))).toBe("start");
    expect(g.move(10)).toBe(true);

    expect(g.down(touch(11))).toBe("ignore"); // chạm thứ hai
    expect(g.move(11)).toBe(false);           // di chuyển của nó không được trộn vào nét
    expect(g.up(11)).toBe(false);             // nhấc nó lên không kết thúc nét

    expect(g.move(10)).toBe(true);            // nét gốc vẫn nguyên
    expect(g.up(10)).toBe(true);              // và là cái duy nhất được chấm
  });

  it("bút thắng cảm ứng đang viết dở (lòng bàn tay chạm trước bút)", () => {
    const g = createPointerGate();
    expect(g.down(touch(10))).toBe("start");
    expect(g.down(pen(20))).toBe("restart");
    expect(g.activeId).toBe(20);
    expect(g.move(10)).toBe(false); // cảm ứng cũ bị gạt đi
    expect(g.up(10)).toBe(false);
    expect(g.move(20)).toBe(true);
    expect(g.up(20)).toBe(true);
  });

  it("cảm ứng chạm sau khi bút đã xuống thì bị bỏ qua; bút không bị bút khác chen", () => {
    const g = createPointerGate();
    expect(g.down(pen(20))).toBe("start");
    expect(g.down(touch(10))).toBe("ignore");
    expect(g.down(pen(21))).toBe("ignore");
    expect(g.activeId).toBe(20);
  });

  it("pointercancel bỏ nét dở (không chấm) và nhả cổng cho nét sau", () => {
    const g = createPointerGate();
    g.down(touch(10));
    expect(g.cancel(11)).toBe(false); // huỷ của con trỏ khác không ảnh hưởng
    expect(g.activeId).toBe(10);
    expect(g.cancel(10)).toBe(true);
    expect(g.activeId).toBeNull();
    expect(g.down(touch(12))).toBe("start");
  });

  it("chuột phải/giữa không được viết", () => {
    const g = createPointerGate();
    expect(g.down(mouse(1, 2))).toBe("ignore");
    expect(g.down(mouse(1, 1))).toBe("ignore");
    expect(g.activeId).toBeNull();
    expect(g.down(mouse(1, 0))).toBe("start");
  });

  it("cùng một con trỏ xuống lần nữa (sự kiện up thất lạc) thì viết lại thay vì kẹt", () => {
    const g = createPointerGate();
    g.down(touch(10));
    expect(g.down(touch(10))).toBe("restart");
    expect(g.up(10)).toBe(true);
  });

  it("reset nhả cổng; pointerType lạ coi như chuột", () => {
    const g = createPointerGate();
    g.down(touch(10));
    g.reset();
    expect(g.activeId).toBeNull();
    expect(g.down(touch(11))).toBe("start");
    expect(pointerKind("")).toBe("mouse");
    expect(pointerKind("pen")).toBe("pen");
    expect(pointerKind("touch")).toBe("touch");
  });
});
