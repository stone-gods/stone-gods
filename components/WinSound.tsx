"use client";

import { useEffect, useRef } from "react";

const WIN_SOUND_SRC = "/assets/sounds/win.wav";

type WinSoundProps = {
  active: boolean;
};

export default function WinSound({ active }: WinSoundProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(WIN_SOUND_SRC);
    audio.preload = "auto";
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!active || !audioRef.current) return;

    const audio = audioRef.current;
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Browsers may block autoplay without a prior user gesture; spin satisfies this.
    });
  }, [active]);

  return null;
}
