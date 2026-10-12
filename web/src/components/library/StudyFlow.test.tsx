// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DecksPane } from "./DecksPane";
import { addCards, addDeck } from "@/lib/space/library";
import { resetSpace, updateSpace } from "@/lib/space/store";
import { SAVED_KEY } from "@/lib/study/saved";

/* Widget test cho luồng Học ngay → phiên học → tổng kết, chạy trên DecksPane thật với kho không gian riêng thật
   (localStorage của jsdom). Chỉ thay next/link: ngoài app router của Next nó không có ngữ cảnh để chạy. */

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

const CARDS = [
  { front: "私", back: "tôi", hint: "わたし" },
  { front: "あなた", back: "bạn", hint: "" },
  { front: "水", back: "nước", hint: "みず" },
];

/** Tạo một bộ thẻ trong kho, trả về mã bộ. */
function seedDeck(name: string, cards = CARDS): string {
  let id = "";
  updateSpace((s) => {
    const r = addDeck(s, name);
    id = r.deck.id;
    return cards.length ? addCards(r.space, id, cards).space : r.space;
  });
  return id;
}

/** Chạy hết hiệu ứng lật/chuyển thẻ (khoá trong reducer mở sau FLIP_MS / CARD_IN_MS). */
const settle = () => act(() => { vi.advanceTimersByTime(600); });
const button = (name: string | RegExp) => screen.getByRole("button", { name });
const isDisabled = (el: HTMLElement) => (el as HTMLButtonElement).disabled;
const studyDialog = () => screen.getByRole("dialog", { name: /^Học bộ thẻ/ });
const progressText = () => within(studyDialog()).getByText(/^Thẻ \d+ \/ \d+$|^Hoàn thành$/).textContent;

/** Mở chi tiết bộ (danh sách → "Mở bộ thẻ"). */
function openDeck() {
  fireEvent.click(button("Mở bộ thẻ"));
}

function startFromDetail() {
  openDeck();
  fireEvent.click(button(/^Học ngay/));
}

/** Lật thẻ đang học rồi đánh giá. */
function answer(verdict: "Đã nhớ" | "Chưa nhớ") {
  fireEvent.click(button(/^Lật thẻ/));
  settle();
  fireEvent.click(button(new RegExp(`^${verdict}`)));
  settle();
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  resetSpace();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("nút Học ngay", () => {
  it("bị tắt và có hướng dẫn thêm thẻ khi bộ thẻ rỗng", () => {
    seedDeck("Bộ trống", []);
    render(<DecksPane />);
    // Trong danh sách bộ
    expect(isDisabled(button("Học ngay"))).toBe(true);
    // Trong chi tiết bộ
    openDeck();
    expect(isDisabled(button("Học ngay"))).toBe(true);
    expect(screen.getByText(/Bộ thẻ còn trống — thêm ít nhất một thẻ/)).toBeTruthy();
  });

  it("ghi tổng số thẻ khi bộ có thẻ", () => {
    seedDeck("Từ vựng");
    render(<DecksPane />);
    expect(isDisabled(button("Học ngay (3 thẻ)"))).toBe(false);
  });
});

describe("phiên học", () => {
  it("bấm Học ngay mở thẻ đầu tiên ở mặt trước, mặt sau chưa có trong trang", () => {
    seedDeck("Từ vựng");
    render(<DecksPane />);
    startFromDetail();

    const dialog = studyDialog();
    expect(progressText()).toBe("Thẻ 1 / 3");
    expect(within(dialog).getByText("私")).toBeTruthy();
    expect(within(dialog).queryByText("tôi")).toBeNull();
    expect(button(/^Lật thẻ/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Đã nhớ/ })).toBeNull();
    // Focus vào thẻ, không ở lại nút "Học ngay" phía sau lớp phủ.
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Chạm để lật thẻ");
  });

  it("lật thẻ hiện đáp án và đúng cụm nút đánh giá", () => {
    seedDeck("Từ vựng");
    render(<DecksPane />);
    startFromDetail();

    fireEvent.click(button(/^Lật thẻ/));
    expect(within(studyDialog()).getByText("tôi")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Lật thẻ/ })).toBeNull();
    // Trong lúc thẻ đang lật, nút đánh giá bị khoá.
    expect(isDisabled(button(/^Chưa nhớ/))).toBe(true);
    expect(isDisabled(button(/^Đã nhớ/))).toBe(true);
    settle();
    expect(isDisabled(button(/^Chưa nhớ/))).toBe(false);
    expect(isDisabled(button(/^Đã nhớ/))).toBe(false);
  });

  it("chạm vào thẻ cũng lật được", () => {
    seedDeck("Từ vựng");
    render(<DecksPane />);
    startFromDetail();
    fireEvent.click(button("Chạm để lật thẻ"));
    expect(within(studyDialog()).getByText("tôi")).toBeTruthy();
  });

  it("đánh giá ghi nhận kết quả, tăng tiến trình và chuyển sang mặt trước thẻ kế", () => {
    seedDeck("Từ vựng");
    render(<DecksPane />);
    startFromDetail();

    answer("Đã nhớ");
    const dialog = studyDialog();
    expect(progressText()).toBe("Thẻ 2 / 3");
    expect(within(dialog).getByRole("progressbar").getAttribute("aria-valuenow")).toBe("1");
    expect(within(dialog).getByText("あなた")).toBeTruthy();
    expect(within(dialog).queryByText("bạn")).toBeNull();
    expect(button(/^Lật thẻ/)).toBeTruthy();
  });

  it("bấm đánh giá liên tục không nhảy cóc qua thẻ", () => {
    seedDeck("Từ vựng");
    render(<DecksPane />);
    startFromDetail();

    fireEvent.click(button(/^Lật thẻ/));
    settle();
    const known = button(/^Đã nhớ/);
    // Ba cú bấm trong cùng một tick, trước khi React kịp vẽ lại (chạm đúp, bấm nhanh): cả ba đều trúng nút cũ.
    // `fireEvent.click` riêng lẻ thì vẽ lại sau mỗi cú nên cú thứ hai rơi vào nút đã bị gỡ — không thử được gì.
    act(() => { known.click(); known.click(); known.click(); });
    settle();
    expect(progressText()).toBe("Thẻ 2 / 3");
  });

  it("phím tắt bị bỏ qua trong lúc thẻ đang lật hoặc thẻ mới đang trượt vào", () => {
    // Nút bị `disabled` trong lúc chạy hiệu ứng, nhưng phím tắt đi thẳng vào reducer: chỉ có khoá của reducer chặn.
    seedDeck("Từ vựng");
    render(<DecksPane />);
    startFromDetail();

    fireEvent.keyDown(window, { key: " " }); // bắt đầu lật
    fireEvent.keyDown(window, { key: "2" }); // đánh giá khi thẻ còn đang lật
    expect(progressText()).toBe("Thẻ 1 / 3");

    settle();
    fireEvent.keyDown(window, { key: "2" });
    expect(progressText()).toBe("Thẻ 2 / 3");
    fireEvent.keyDown(window, { key: " " }); // lật khi thẻ mới còn đang trượt vào
    expect(within(studyDialog()).queryByText("bạn")).toBeNull();

    settle();
    fireEvent.keyDown(window, { key: " " });
    expect(within(studyDialog()).getByText("bạn")).toBeTruthy();
  });

  it("phím tắt: Space lật, 2 = Đã nhớ", () => {
    seedDeck("Từ vựng");
    render(<DecksPane />);
    startFromDetail();

    fireEvent.keyDown(window, { key: " " });
    expect(within(studyDialog()).getByText("tôi")).toBeTruthy();
    settle();
    fireEvent.keyDown(window, { key: "2" });
    settle();
    expect(progressText()).toBe("Thẻ 2 / 3");
  });

  it("“Học từ thẻ này” bắt đầu đúng thẻ được chọn", () => {
    seedDeck("Từ vựng");
    render(<DecksPane />);
    openDeck();
    fireEvent.click(button("Học từ thẻ “あなた”"));
    expect(progressText()).toBe("Thẻ 1 / 2");
    expect(within(studyDialog()).getByText("あなた")).toBeTruthy();
  });
});

describe("kết thúc phiên", () => {
  it("hoàn thành thẻ cuối hiện màn tổng kết với số liệu đúng", () => {
    seedDeck("Từ vựng");
    render(<DecksPane />);
    startFromDetail();

    answer("Đã nhớ");
    answer("Chưa nhớ");
    answer("Đã nhớ");

    const dialog = studyDialog();
    expect(progressText()).toBe("Hoàn thành");
    expect(within(dialog).getByText("Xong phiên học")).toBeTruthy();
    const stat = (label: string) => within(dialog).getByText(label).nextElementSibling?.textContent;
    expect(stat("Đã nhớ")).toBe("2");
    expect(stat("Chưa nhớ")).toBe("1");
    expect(stat("Chính xác")).toBe("67%");
    expect(isDisabled(button("Ôn lại 1 thẻ chưa nhớ"))).toBe(false);
    expect(isDisabled(button("Quay về thư viện"))).toBe(false);
  });

  it("“Ôn lại các thẻ chưa nhớ” chỉ học lại thẻ chưa nhớ, từ mặt trước", () => {
    seedDeck("Từ vựng");
    render(<DecksPane />);
    startFromDetail();
    answer("Đã nhớ");
    answer("Chưa nhớ");
    answer("Đã nhớ");

    fireEvent.click(button("Ôn lại 1 thẻ chưa nhớ"));
    expect(progressText()).toBe("Thẻ 1 / 1");
    expect(within(studyDialog()).getByText("あなた")).toBeTruthy();
    expect(within(studyDialog()).getByText(/ôn lại lần 1/)).toBeTruthy();
  });

  it("nhớ hết thì không có vòng ôn lại", () => {
    seedDeck("Từ vựng", CARDS.slice(0, 1));
    render(<DecksPane />);
    startFromDetail();
    answer("Đã nhớ");
    expect(isDisabled(button("Không còn thẻ chưa nhớ"))).toBe(true);
  });
});

describe("thoát giữa chừng", () => {
  it("chưa đánh giá thẻ nào thì thoát ngay, không hỏi lưu", () => {
    seedDeck("Từ vựng");
    render(<DecksPane />);
    startFromDetail();

    fireEvent.click(button("Thoát phiên học"));
    leaveViaHistory();
    expect(screen.queryByRole("dialog", { name: /^Học bộ thẻ/ })).toBeNull();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("hỏi “Lưu phiên học dở dang?”, lưu K rồi học tiếp đúng thẻ, focus về nút học", () => {
    const deckId = seedDeck("Từ vựng");
    render(<DecksPane />);
    startFromDetail();
    answer("Chưa nhớ");

    fireEvent.keyDown(window, { key: "Escape" });
    const ask = screen.getByRole("alertdialog", { name: "Lưu phiên học dở dang?" });
    expect(within(ask).getByText("1 / 3")).toBeTruthy();

    fireEvent.click(within(ask).getByRole("button", { name: "Lưu và thoát" }));
    leaveViaHistory();
    expect(screen.queryByRole("dialog", { name: /^Học bộ thẻ/ })).toBeNull();

    const saved = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "{}");
    expect(saved[deckId]).toMatchObject({ index: 1, results: { [Object.keys(saved[deckId].results)[0]]: "again" } });

    const resume = button("Học tiếp (2/3)");
    expect(document.activeElement).toBe(resume);
    fireEvent.click(resume);
    expect(progressText()).toBe("Thẻ 2 / 3");
    expect(within(studyDialog()).getByText("あなた")).toBeTruthy();
  });

  it("“Thoát, không lưu” bỏ phiên dở; “Học tiếp” đóng hộp thoại và giữ nguyên thẻ", () => {
    seedDeck("Từ vựng");
    render(<DecksPane />);
    startFromDetail();
    answer("Đã nhớ");

    fireEvent.click(button("Thoát phiên học"));
    fireEvent.click(button("Học tiếp"));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(progressText()).toBe("Thẻ 2 / 3");

    fireEvent.click(button("Thoát phiên học"));
    fireEvent.click(button("Thoát, không lưu"));
    leaveViaHistory();
    expect(localStorage.getItem(SAVED_KEY)).toBeNull();
    expect(button("Học ngay (3 thẻ)")).toBeTruthy();
  });
});

/** Thoát bằng nút trong trang gọi `history.back()`. jsdom xếp việc lùi lịch sử (và `popstate`) bằng `setTimeout` của
 *  window — chính hàm bị hẹn giờ giả thay — nên phải đẩy đồng hồ giả: lượt đầu bắn `popstate` (rời màn học), lượt sau
 *  chạy hẹn giờ trả focus. Báo lỗi rõ nếu `popstate` không đến, thay vì để test chờ đến hết giờ. */
function leaveViaHistory() {
  let popped = false;
  window.addEventListener("popstate", () => { popped = true; }, { once: true });
  act(() => { vi.advanceTimersByTime(50); });
  act(() => { vi.advanceTimersByTime(50); });
  if (!popped) throw new Error("history.back() không bắn popstate");
}
