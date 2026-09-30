"use client";

import { useCallback, useEffect, useState } from "react";

/** Đọc tiếng Nhật bằng Web Speech API. Danh sách giọng nạp bất đồng bộ nên phải nghe
 *  sự kiện voiceschanged; máy không cài giọng ja-JP thì báo để người học biết vì sao đọc sai. */
export function useSpeech() {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [checked, setChecked] = useState(false);

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
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  const speak = useCallback(
    (text: string, rate = 0.85) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP";
      u.rate = rate;
      if (voice) u.voice = voice;
      window.speechSynthesis.speak(u);
    },
    [supported, voice],
  );

  return { speak, supported, missingVoice: supported && checked && !voice };
}
