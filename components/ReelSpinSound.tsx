"use client";

import { useEffect, useRef } from "react";

const REEL_SPIN_SRC = "/assets/sounds/reel-spin.wav";

type ReelSpinSoundProps = {
  spinning: boolean;
};

export default function ReelSpinSound({ spinning }: ReelSpinSoundProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(REEL_SPIN_SRC);
    audio.preload = "auto";
    audio.loop = true;
    audio.volume = 0.55;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (spinning) {
      audio.currentTime = 0;
      void audio.play().catch(() => {});
      return;
    }

    audio.pause();
    audio.currentTime = 0;
  }, [spinning]);

  return null;
}
