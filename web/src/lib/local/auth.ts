/** Tài khoản cục bộ thay cho AuthService + JWT: tài khoản nằm trong localStorage của chính trình duyệt này,
 *  "phiên đăng nhập" là một con trỏ tới tài khoản đang dùng. Không có token thật.
 *
 *  Mật khẩu được băm có muối (SHA-256 qua Web Crypto; ngữ cảnh không an toàn như http://IP-LAN không có
 *  Web Crypto nên dùng băm yếu cyrb53). Đây KHÔNG phải bảo mật thật — ai mở được DevTools trên máy này đều
 *  đọc được dữ liệu — chỉ để mật khẩu không nằm ở dạng thô. */
import type { UserDto } from "../types";
import { dataFor } from "./gamification";
import { findUser, load, nowMs, save, type Db, type LocalUser } from "./db";
import { conflict, unauthorized, validation } from "./errors";
import { isValidTimezone } from "./time";

const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";
const ACCESS_TTL_SECONDS = 900;

export interface AuthResult { accessToken: string; refreshToken: string; expiresIn: number; user: UserDto }

export const toDto = (u: LocalUser): UserDto => ({
  id: u.id, email: u.email, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl,
  role: u.role, plan: u.plan, timezone: u.timezone, locale: u.locale, dailyGoalXp: u.dailyGoalXp, createdAt: u.createdAt,
});

const session = (u: LocalUser): AuthResult =>
  ({ accessToken: `local.${u.id}.${nowMs()}`, refreshToken: "", expiresIn: ACCESS_TTL_SECONDS, user: toDto(u) });

// -------------------------------------------------------------------- băm mật khẩu

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

/** cyrb53 — băm 53 bit không mật mã, chỉ dùng khi không có Web Crypto. */
function cyrb53(str: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return hex(bytes);
}

async function digest(salt: string, password: string): Promise<string> {
  const text = `${salt}:${password}`;
  const subtle = globalThis.crypto?.subtle;
  if (subtle) return `sha256:${hex(new Uint8Array(await subtle.digest("SHA-256", new TextEncoder().encode(text))))}`;
  return `weak:${cyrb53(text)}`;
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomSalt();
  return `${salt}$${await digest(salt, password)}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const i = stored.indexOf("$");
  return i > 0 && (await digest(stored.slice(0, i), password)) === stored.slice(i + 1);
}

// -------------------------------------------------------------------- đăng ký / đăng nhập

export interface RegisterRequest { email?: string; username?: string; password?: string; displayName?: string; timezone?: string }

function validateRegister(req: RegisterRequest) {
  const errors: Record<string, string> = {};
  const email = req.email?.trim() ?? "";
  if (!email) errors.email = "Email không được để trống";
  else if (!/^[^\s@]+@[^\s@]+$/.test(email)) errors.email = "Email không đúng định dạng";
  else if (email.length > 190) errors.email = "Email quá dài";

  const username = req.username?.trim() ?? "";
  if (!username) errors.username = "Tên đăng nhập không được để trống";
  else if (username.length < 3 || username.length > 32) errors.username = "Tên đăng nhập phải từ 3 đến 32 ký tự";
  else if (!/^[a-zA-Z0-9._-]+$/.test(username)) errors.username = "Tên đăng nhập chỉ được chứa chữ, số và các ký tự . _ -";

  if (!req.password) errors.password = "Mật khẩu không được để trống";
  else if (req.password.length < 8 || req.password.length > 72) errors.password = "Mật khẩu phải có ít nhất 8 ký tự";

  const displayName = req.displayName?.trim() ?? "";
  if (!displayName) errors.displayName = "Tên hiển thị không được để trống";
  else if (displayName.length > 64) errors.displayName = "Tên hiển thị tối đa 64 ký tự";

  if (req.timezone && req.timezone.length > 64) errors.timezone = "Múi giờ không hợp lệ";
  if (Object.keys(errors).length) throw validation(errors);
}

export async function register(req: RegisterRequest): Promise<AuthResult> {
  validateRegister(req);
  const email = req.email!.trim().toLowerCase();
  const username = req.username!.trim();
  const timezone = req.timezone?.trim() || DEFAULT_TIMEZONE;
  if (!isValidTimezone(timezone)) {
    throw validation({ timezone: "Múi giờ không hợp lệ, ví dụ hợp lệ: Asia/Ho_Chi_Minh" }, "Múi giờ không hợp lệ");
  }
  // Băm xong mới đọc kho, để giữa lúc đọc và ghi không có điểm `await`.
  const passwordHash = await hashPassword(req.password!);

  const db = load();
  if (db.users.some((u) => u.email === email)) {
    throw conflict("Email đã được sử dụng", { email: "Email đã được sử dụng" });
  }
  if (db.users.some((u) => u.username === username)) {
    throw conflict("Tên đăng nhập đã được sử dụng", { username: "Tên đăng nhập đã được sử dụng" });
  }

  const user: LocalUser = {
    id: ++db.seq.user, email, username, passwordHash, displayName: req.displayName!.trim(),
    avatarUrl: null, role: "USER", plan: "FREE", timezone, locale: "vi", dailyGoalXp: 50,
    createdAt: new Date(nowMs()).toISOString(),
  };
  db.users.push(user);
  db.session = user.id;
  dataFor(db, user); // khởi tạo chỉ số học tập rỗng
  save(db);
  return session(user);
}

export interface LoginRequest { emailOrUsername?: string; password?: string }

export async function login(req: LoginRequest): Promise<AuthResult> {
  const errors: Record<string, string> = {};
  if (!req.emailOrUsername?.trim()) errors.emailOrUsername = "Email hoặc tên đăng nhập không được để trống";
  if (!req.password) errors.password = "Mật khẩu không được để trống";
  if (Object.keys(errors).length) throw validation(errors);

  const ident = req.emailOrUsername!.trim();
  const found = load().users.find((u) => u.email === ident.toLowerCase() || u.username === ident);
  // Cùng một thông báo cho mọi nguyên nhân để không giúp dò xem tài khoản có tồn tại không.
  if (!found || !(await verifyPassword(req.password!, found.passwordHash))) {
    throw unauthorized("Email/tên đăng nhập hoặc mật khẩu không đúng");
  }

  const db = load();
  if (!findUser(db, found.id)) throw unauthorized("Email/tên đăng nhập hoặc mật khẩu không đúng");
  db.session = found.id;
  save(db);
  return session(found);
}

/** Khôi phục phiên khi tải trang — tương đương POST /auth/refresh. */
export function refresh(): AuthResult {
  const db = load();
  const user = db.session === null ? undefined : findUser(db, db.session);
  if (!user) throw unauthorized("Phiên đăng nhập không hợp lệ");
  return session(user);
}

export function logout() {
  const db = load();
  db.session = null;
  save(db);
}

export function requireUser(db: Db): LocalUser {
  const user = db.session === null ? undefined : findUser(db, db.session);
  if (!user) throw unauthorized("Bạn cần đăng nhập để tiếp tục");
  return user;
}

export interface ProfileRequest { displayName?: string; timezone?: string; dailyGoalXp?: number | null; locale?: string }

export function updateProfile(user: LocalUser, req: ProfileRequest): UserDto {
  const errors: Record<string, string> = {};
  if (req.displayName != null && req.displayName.length > 64) errors.displayName = "Tên hiển thị tối đa 64 ký tự";
  if (req.timezone != null && req.timezone.length > 64) errors.timezone = "Múi giờ không hợp lệ";
  if (req.dailyGoalXp != null) {
    if (req.dailyGoalXp < 10) errors.dailyGoalXp = "Mục tiêu ngày tối thiểu là 10 XP";
    else if (req.dailyGoalXp > 5000) errors.dailyGoalXp = "Mục tiêu ngày tối đa là 5000 XP";
  }
  if (req.locale != null && req.locale.length > 8) errors.locale = "Mã ngôn ngữ không hợp lệ";
  if (Object.keys(errors).length) throw validation(errors);

  if (req.displayName?.trim()) user.displayName = req.displayName.trim();
  if (req.timezone?.trim()) {
    const tz = req.timezone.trim();
    if (!isValidTimezone(tz)) {
      throw validation({ timezone: "Múi giờ không hợp lệ, ví dụ hợp lệ: Asia/Ho_Chi_Minh" }, "Múi giờ không hợp lệ");
    }
    user.timezone = tz;
  }
  if (req.dailyGoalXp != null) user.dailyGoalXp = req.dailyGoalXp;
  if (req.locale?.trim()) user.locale = req.locale.trim();
  return toDto(user);
}
