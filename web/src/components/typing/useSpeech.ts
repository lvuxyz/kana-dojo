"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SpeakOptions {
  rate?: number;
  /** Định danh của thứ đang đọc (mặc định là chính đoạn văn bản) để giao diện biết nút nào đang phát. */
  key?: string;
}

/** Đọc tiếng Nhật bằng Web Speech API. Danh sách giọng nạp bất đồng bộ nên phải nghe
 *  sự kiện voiceschanged; máy không cài giọng ja-JP thì báo để người học biết vì sao đọc sai. */
export function useSpeech() {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [checked, setChecked] = useState(false);
  const [speaking, setSpeaking] = useState<string | null>(null);
  // cancel() bắn end/error cho câu cũ sau khi câu mới đã bắt đầu, nên chỉ câu hiện hành mới được xoá trạng thái.
  const current = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!supported) return;
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;
      setVoice(voices.find((v) => /^ja/i.test(v.lang)) ?? null);
      setChecked(true);
    };
    pick();
    window.speechSynthesis.addEventListener("voiceschanged", pick);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", pick);
      current.current = null;
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  const speak = useCallback(
    (text: string, { rate = 0.85, key = text }: SpeakOptions = {}) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP";
      u.rate = rate;
      if (voice) u.voice = voice;
      const done = () => {
        if (current.current !== u) return;
        current.current = null;
        setSpeaking(null);
      };
      u.onend = done;
      u.onerror = done;
      current.current = u;
      setSpeaking(key);
      window.speechSynthesis.speak(u);
    },
    [supported, voice],
  );

  return { speak, speaking, supported, missingVoice: supported && checked && !voice };
}
