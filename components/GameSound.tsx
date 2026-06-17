"use client";

import { useEffect, useRef } from "react";

type GameSoundProps = {
  src: string;
  active: boolean;
};

export default function GameSound({ src, active }: GameSoundProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(src);
    audio.preload = "auto";
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [src]);

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
