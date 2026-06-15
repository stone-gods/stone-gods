"use client";

import { useRef, useState } from "react";
import GameModals, { type PostSpinPhase } from "@/components/GameModals";
import SlotMachine from "@/components/SlotMachine";
import type { SpinApiResponse } from "@/types/game";

const RESULT_SPLASH_MS = 3000;

export default function GameShell() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastSpinResult, setLastSpinResult] = useState<SpinApiResponse | null>(null);
  const [postSpinDismissed, setPostSpinDismissed] = useState(false);
  const [postSpinPhase, setPostSpinPhase] = useState<PostSpinPhase>("idle");
  const [spinBlocked, setSpinBlocked] = useState(true);
  const splashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSpinComplete(result: SpinApiResponse) {
    if (splashTimerRef.current) {
      clearTimeout(splashTimerRef.current);
      splashTimerRef.current = null;
    }

    setLastSpinResult(result);
    setPostSpinDismissed(false);
    setRefreshKey((k) => k + 1);

    if (result.outcome === "NFT_WIN") {
      setPostSpinPhase("idle");
      return;
    }

    const noSpinsLeft =
      result.spinsRemaining === 0 || result.canSpinAgainAt !== null;

    setPostSpinPhase("splash");
    splashTimerRef.current = setTimeout(() => {
      splashTimerRef.current = null;
      if (noSpinsLeft) {
        setPostSpinPhase("cooldown");
      } else {
        setPostSpinPhase("idle");
        setLastSpinResult(null);
      }
    }, RESULT_SPLASH_MS);
  }

  function handlePostSpinDismiss() {
    if (splashTimerRef.current) {
      clearTimeout(splashTimerRef.current);
      splashTimerRef.current = null;
    }
    setPostSpinPhase("idle");
    setPostSpinDismissed(true);
    setLastSpinResult(null);
  }

  function handleClaimComplete() {
    if (splashTimerRef.current) {
      clearTimeout(splashTimerRef.current);
      splashTimerRef.current = null;
    }
    setPostSpinPhase("idle");
    setLastSpinResult(null);
    setPostSpinDismissed(true);
    setRefreshKey((k) => k + 1);
  }

  return (
    <>
      <SlotMachine onSpinComplete={handleSpinComplete} spinDisabled={spinBlocked} />
      <GameModals
        refreshKey={refreshKey}
        lastSpinResult={lastSpinResult}
        postSpinPhase={postSpinPhase}
        postSpinDismissed={postSpinDismissed}
        onPostSpinDismiss={handlePostSpinDismiss}
        onClaimComplete={handleClaimComplete}
        onSpinBlockedChange={setSpinBlocked}
      />
    </>
  );
}
