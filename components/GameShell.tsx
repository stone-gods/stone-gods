"use client";

import { useRef, useState } from "react";
import GameModals, { type PostSpinPhase } from "@/components/GameModals";
import SlotMachine from "@/components/SlotMachine";
import GameSound from "@/components/GameSound";
import WinFireworks from "@/components/WinFireworks";
import type { SpinApiResponse } from "@/types/game";

const RESULT_SPLASH_MS = 3000;
const WIN_CELEBRATION_MS = 5000;

export default function GameShell() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastSpinResult, setLastSpinResult] = useState<SpinApiResponse | null>(null);
  const [postSpinDismissed, setPostSpinDismissed] = useState(false);
  const [postSpinPhase, setPostSpinPhase] = useState<PostSpinPhase>("idle");
  const [spinBlocked, setSpinBlocked] = useState(true);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearPhaseTimer() {
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
  }

  function handleSpinComplete(result: SpinApiResponse) {
    clearPhaseTimer();

    setLastSpinResult(result);
    setPostSpinDismissed(false);

    if (result.outcome === "NFT_WIN") {
      setPostSpinPhase("win-celebration");
      phaseTimerRef.current = setTimeout(() => {
        phaseTimerRef.current = null;
        setPostSpinPhase("claim");
        setRefreshKey((k) => k + 1);
      }, WIN_CELEBRATION_MS);
      return;
    }

    setRefreshKey((k) => k + 1);

    const noSpinsLeft =
      result.spinsRemaining === 0 || result.canSpinAgainAt !== null;

    setPostSpinPhase("splash");
    phaseTimerRef.current = setTimeout(() => {
      phaseTimerRef.current = null;
      if (noSpinsLeft) {
        setPostSpinPhase("cooldown");
      } else {
        setPostSpinPhase("idle");
        setLastSpinResult(null);
      }
    }, RESULT_SPLASH_MS);
  }

  function handlePostSpinDismiss() {
    clearPhaseTimer();
    setPostSpinPhase("idle");
    setPostSpinDismissed(true);
    setLastSpinResult(null);
  }

  function handleClaimComplete() {
    clearPhaseTimer();
    setPostSpinPhase("idle");
    setLastSpinResult(null);
    setPostSpinDismissed(true);
    setRefreshKey((k) => k + 1);
  }

  const celebratingWin = postSpinPhase === "win-celebration";
  const playingLossSound =
    postSpinPhase === "splash" &&
    lastSpinResult !== null &&
    lastSpinResult.outcome !== "NFT_WIN";

  return (
    <>
      <SlotMachine
        onSpinComplete={handleSpinComplete}
        spinDisabled={spinBlocked}
        celebratingWin={celebratingWin}
      />
      {celebratingWin ? <WinFireworks /> : null}
      <GameSound src="/assets/sounds/win.wav" active={celebratingWin} />
      <GameSound src="/assets/sounds/lose.wav" active={playingLossSound} />
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
