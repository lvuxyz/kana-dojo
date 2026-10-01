import { redirect } from "next/navigation";

/* CHẾ ĐỘ CÁ NHÂN (tạm thời) — xem docs/LOCAL_MODE.md.
   Không có tài khoản nên không có trang đăng ký: ai mở đường dẫn này (link cũ, trang giới thiệu) được đưa thẳng vào
   ứng dụng. Mã gốc của trang được giữ nguyên bên dưới, mỗi dòng bắt đầu bằng `// ` (đánh dấu `[máy chủ — đang tắt]`).
   Bật lại: xoá đoạn redirect này, bỏ tiền tố `// ` ở phần mã gốc. */
export default function Page() {
  redirect("/bang-dieu-khien");
}

// [máy chủ — đang tắt]
// "use client";
//
// import { useState } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { Button, Card, Field } from "@/components/ui";
// import { GoogleButton } from "@/components/app/GoogleButton";
// import { useAuth } from "@/lib/auth-context";
//
// export default function RegisterPage() {
//   const { register } = useAuth();
//   const router = useRouter();
//   const [f, setF] = useState({ displayName: "", username: "", email: "", password: "" });
//   const [err, setErr] = useState("");
//   const [busy, setBusy] = useState(false);
//   const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
//
//   const submit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (f.password.length < 8) { setErr("Mật khẩu cần ít nhất 8 ký tự."); return; }
//     setErr(""); setBusy(true);
//     try {
//       await register(f);
//       router.push("/bang-dieu-khien");
//     } catch (e) {
//       setErr(e instanceof Error ? e.message : "Đăng ký không thành công");
//     } finally {
//       setBusy(false);
//     }
//   };
//
//   return (
//     <Card variant="luxury" className="flex flex-col gap-5 px-7 py-8 shadow-xl">
//       <div className="flex items-center justify-between">
//         <div>
//           <h1 className="font-mincho text-2xl font-bold text-sumi">Tạo tài khoản</h1>
//           <p className="mt-1 text-sm font-medium text-sumi-3">
//             Miễn phí trọn đời. 208 ký tự Kana không giới hạn.
//           </p>
//         </div>
//         <span className="hanko-seal px-2 py-0.5 text-xs">
//           入門
//         </span>
//       </div>
//
//       <form onSubmit={submit} className="flex flex-col gap-4">
//         <Field
//           label="Tên hiển thị"
//           value={f.displayName}
//           onChange={set("displayName")}
//           required
//           maxLength={64}
//           placeholder="Ví dụ: Minh Nhật"
//         />
//         <Field
//           label="Tên đăng nhập"
//           value={f.username}
//           onChange={set("username")}
//           required
//           pattern="[a-zA-Z0-9_]{3,32}"
//           title="3–32 ký tự: chữ, số hoặc dấu gạch dưới"
//           autoComplete="username"
//           placeholder="minhnhat_jp"
//         />
//         <Field
//           label="Email"
//           type="email"
//           value={f.email}
//           onChange={set("email")}
//           required
//           autoComplete="email"
//           placeholder="email@example.com"
//         />
//         <Field
//           label="Mật khẩu (tối thiểu 8 ký tự)"
//           type="password"
//           value={f.password}
//           onChange={set("password")}
//           required
//           minLength={8}
//           autoComplete="new-password"
//         />
//         {err && (
//           <p className="rounded-xl border border-shu/30 bg-shu-tint px-3.5 py-2.5 text-[13px] font-semibold text-shu-2">
//             {err}
//           </p>
//         )}
//         <Button type="submit" variant="solid" size="lg" disabled={busy} className="mt-1 shadow-md shadow-shu/25">
//           {busy ? "Đang tạo tài khoản…" : "Gia nhập Dōjō miễn phí"}
//         </Button>
//       </form>
//
//       <div className="flex items-center gap-3 text-xs font-semibold text-sumi-3 uppercase tracking-wider">
//         <span className="h-px flex-1 bg-rule/70" />
//         hoặc
//         <span className="h-px flex-1 bg-rule/70" />
//       </div>
//
//       <GoogleButton label="Đăng ký nhanh với Google" />
//
//       <p className="text-center text-[13.5px] font-medium text-sumi-3 pt-1">
//         Đã có tài khoản?{" "}
//         <Link href="/dang-nhap" className="font-semibold text-shu hover:underline">
//           Đăng nhập ngay
//         </Link>
//       </p>
//     </Card>
//   );
// }
