/* Nhận diện ngữ cảnh cài đặt PWA — thuần hàm để test bằng Node. */

export type InstallContext = "installed" | "ios" | "other";

export interface InstallEnv {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  /** matchMedia("(display-mode: standalone)").matches */
  standaloneMedia: boolean;
  /** navigator.standalone — chỉ có trên Safari iOS */
  navigatorStandalone: boolean;
}

/** - `installed`: đang chạy trong ứng dụng đã cài (không có thanh địa chỉ).
 *  - `ios`: iPhone/iPad chưa cài. iOS không có `beforeinstallprompt` nên phải chỉ người dùng tự làm qua nút Chia sẻ.
 *  - `other`: còn lại; trình duyệt nào có thể cài sẽ tự bắn `beforeinstallprompt`. */
export function detectInstallContext(env: InstallEnv): InstallContext {
  if (env.standaloneMedia || env.navigatorStandalone) return "installed";
  const iosUa = /iphone|ipad|ipod/i.test(env.userAgent);
  const ipadOs = env.platform === "MacIntel" && env.maxTouchPoints > 1; // iPadOS 13+ tự xưng là Mac
  return iosUa || ipadOs ? "ios" : "other";
}
