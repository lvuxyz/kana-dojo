/**
 * Bộ tạo âm thanh gõ phím và hiệu ứng Web Audio API thuần cho phòng luyện gõ.
 * Không dùng file âm thanh ngoài: độ trễ bằng 0, không tốn băng thông, hoạt động offline 100%.
 */

export type SoundTheme = "thock" | "clicky" | "typewriter" | "arcade" | "off";

export interface SoundThemeInfo {
  value: SoundTheme;
  label: string;
  ja: string;
  hint: string;
}

export const SOUND_THEMES: SoundThemeInfo[] = [
  { value: "thock", label: "Thock cơ học", ja: "重低音", hint: "Switch đầm ấm, tiếng thock trầm êm tai" },
  { value: "clicky", label: "Clicky", ja: "爽快", hint: "Switch Blue, tiếng click thanh thoát giòn tan" },
  { value: "typewriter", label: "Máy đánh chữ", ja: "タイプライター", hint: "Cổ điển, tiếng gõ kim loại đanh chắc" },
  { value: "arcade", label: "Arcade 8-bit", ja: "レトロ", hint: "Âm thanh game retro vui tươi" },
  { value: "off", label: "Tắt tiếng", ja: "消音", hint: "Không phát âm thanh khi gõ phím" },
];

/** Âm lượng thực của mọi hiệu ứng trong ván: kiểu "off" tắt hẳn — cả tiếng gõ sai, chuông hết câu và mốc combo. */
export function effectVolume(theme: SoundTheme, volume: number): number {
  return theme === "off" ? 0 : Math.min(1, Math.max(0, volume));
}

const STREAK_MILESTONES = [10, 25, 50, 100];
/** Trên 100 thì cứ mỗi bội số này là một mốc. */
const STREAK_STEP_AFTER_100 = 50;

/**
 * Mốc combo (10, 25, 50, 100, 150, 200…) vừa vượt qua khi chuỗi tăng từ `prev` lên `next`, hoặc null.
 * So theo khoảng chứ không so bằng: ở chế độ IME một lần chốt chữ có thể cộng nhiều ký tự cùng lúc.
 */
export function streakMilestoneCrossed(prev: number, next: number): number | null {
  if (next <= prev) return null;
  if (next >= 100) {
    const top = Math.floor(next / STREAK_STEP_AFTER_100) * STREAK_STEP_AFTER_100;
    if (top > prev) return top;
  }
  for (let i = STREAK_MILESTONES.length - 1; i >= 0; i--) {
    const m = STREAK_MILESTONES[i];
    if (prev < m && m <= next) return m;
  }
  return null;
}

let cachedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!cachedCtx || cachedCtx.state === "closed") {
    cachedCtx = new AudioContextClass();
  }
  if (cachedCtx.state === "suspended") {
    cachedCtx.resume().catch(() => {});
  }
  return cachedCtx;
}

/** Tạo bộ đệm nhiễu trắng ngắn để mô phỏng tiếng va đập phím */
function createNoiseBuffer(ctx: AudioContext, durationSec = 0.04): AudioBuffer {
  const bufferSize = Math.floor(ctx.sampleRate * durationSec);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/** Tạo độ lệch tần số nhỏ ngẫu nhiên để các nhát gõ liên tiếp nghe tự nhiên */
function jitter(base: number, percent = 0.04): number {
  return base * (1 + (Math.random() * 2 - 1) * percent);
}

/** Phát âm thanh khi gõ đúng một phím */
export function playKeySound(theme: SoundTheme, volume = 0.6) {
  if (theme === "off" || volume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(Math.min(1, Math.max(0, volume)), now);
  master.connect(ctx.destination);

  switch (theme) {
    case "thock": {
      // 1. Tiếng va chạm vỏ phím (Lowpass noise burst)
      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(ctx, 0.03);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(jitter(320, 0.08), now);
      filter.Q.setValueAtTime(2.5, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.7, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(master);
      noise.start(now);

      // 2. Tiếng nảy đáy trầm (Low resonant thock thump)
      const osc = ctx.createOscillator();
      osc.type = "sine";
      const startFreq = jitter(145, 0.05);
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 0.5, now + 0.035);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.85, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(oscGain);
      oscGain.connect(master);
      osc.start(now);
      osc.stop(now + 0.04);
      break;
    }

    case "clicky": {
      // 1. Tiếng click đanh nhọn (Highpass noise pop)
      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(ctx, 0.02);

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(jitter(3200, 0.05), now);
      filter.Q.setValueAtTime(5, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.65, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(master);
      noise.start(now);

      // 2. Tiếng lẫy cơ học (High transient triangle snap)
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(jitter(1750, 0.04), now);
      osc.frequency.exponentialRampToValueAtTime(jitter(800, 0.04), now + 0.018);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.6, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

      osc.connect(oscGain);
      oscGain.connect(master);
      osc.start(now);
      osc.stop(now + 0.02);
      break;
    }

    case "typewriter": {
      // 1. Tiếng gõ kim loại (Metallic strike)
      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(ctx, 0.03);

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(jitter(2600, 0.06), now);
      filter.Q.setValueAtTime(4, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.75, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(master);
      noise.start(now);

      // 2. Tiếng va trục cơ học trễ nhẹ
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.setValueAtTime(jitter(240, 0.04), now);

      const oscFilter = ctx.createBiquadFilter();
      oscFilter.type = "lowpass";
      oscFilter.frequency.setValueAtTime(400, now);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.5, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(oscFilter);
      oscFilter.connect(oscGain);
      oscGain.connect(master);
      osc.start(now);
      osc.stop(now + 0.04);
      break;
    }

    case "arcade": {
      // Tiếng chíp chíp 8-bit vui nhộn
      const osc = ctx.createOscillator();
      osc.type = "square";
      const startFreq = jitter(520, 0.05);
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.setValueAtTime(startFreq * 1.5, now + 0.012);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.35, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(oscGain);
      oscGain.connect(master);
      osc.start(now);
      osc.stop(now + 0.035);
      break;
    }
  }
}

/** Phát âm thanh trầm nhẹ khi gõ sai phím */
export function playMissSound(volume = 0.6) {
  if (volume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(Math.min(1, Math.max(0, volume * 0.65)), now);
  master.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(65, now + 0.07);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(220, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.7, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + 0.08);
}

/** Phát âm thanh chuông phong linh (Fuurin / Chime) khi hoàn thành 1 câu */
export function playSentenceCompleteSound(volume = 0.6) {
  if (volume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(Math.min(1, Math.max(0, volume * 0.7)), now);
  master.connect(ctx.destination);

  // Hợp âm ngũ cung thanh thoát (D6: 1174Hz, F#6: 1479Hz, A6: 1760Hz)
  const freqs = [1174.66, 1479.98, 1760.0];
  freqs.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + idx * 0.04);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.4 / (idx + 1), now + idx * 0.04 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.45);

    osc.connect(gain);
    gain.connect(master);
    osc.start(now + idx * 0.04);
    osc.stop(now + idx * 0.04 + 0.5);
  });
}

/** Phát âm thanh khích lệ khi đạt các mốc combo liên tiếp (10, 25, 50, 100...) */
export function playStreakMilestoneSound(streak: number, volume = 0.6) {
  if (volume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(Math.min(1, Math.max(0, volume * 0.75)), now);
  master.connect(ctx.destination);

  // 3 nốt nhạc thăng hoa
  const notes = streak >= 50 ? [1046.5, 1318.51, 1567.98, 2093.0] : [880.0, 1108.73, 1318.51];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + i * 0.05);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.4, now + i * 0.05 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.28);

    osc.connect(gain);
    gain.connect(master);
    osc.start(now + i * 0.05);
    osc.stop(now + i * 0.05 + 0.3);
  });
}
