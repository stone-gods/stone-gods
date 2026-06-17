"use client";

import { useEffect, useRef } from "react";
import { maxReelSpinDurationMs } from "@/lib/slot-timing";

const REEL_SPIN_SRC = "/assets/sounds/reel-spin.wav";

type ReelSpinSoundProps = {
  spinning: boolean;
};

export default function ReelSpinSound({ spinning }: ReelSpinSoundProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spinSessionRef = useRef(0);

  useEffect(() => {
    const audio = new Audio(REEL_SPIN_SRC);
    audio.preload = "auto";
    audio.loop = false;
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

    if (!spinning) {
      spinSessionRef.current += 1;
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    const session = spinSessionRef.current + 1;
    spinSessionRef.current = session;
    const targetSeconds = maxReelSpinDurationMs() / 1000;

    const startPlayback = () => {
      if (spinSessionRef.current !== session || !audioRef.current) return;

      const duration = audio.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;

      audio.playbackRate = Math.max(0.25, Math.min(4, duration / targetSeconds));
      audio.currentTime = 0;
      void audio.play().catch(() => {});
    };

    if (audio.readyState >= 1) {
      startPlayback();
    } else {
      audio.addEventListener("loadedmetadata", startPlayback, { once: true });
    }
  }, [spinning]);

  return null;
}
