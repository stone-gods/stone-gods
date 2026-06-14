"use client";

import { useState } from "react";
import GameModals from "@/components/GameModals";
import SlotMachine from "@/components/SlotMachine";
import type { SpinApiResponse } from "@/types/game";

export default function GameShell() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastSpinResult, setLastSpinResult] = useState<SpinApiResponse | null>(null);
  const [postSpinDismissed, setPostSpinDismissed] = useState(false);
  const [spinBlocked, setSpinBlocked] = useState(true);

  function handleSpinComplete(result: SpinApiResponse) {
    setLastSpinResult(result);
    setPostSpinDismissed(false);
    setRefreshKey((k) => k + 1);
  }

  function handlePostSpinDismiss() {
    setPostSpinDismissed(true);
    setLastSpinResult(null);
  }

  function handleClaimComplete() {
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
        postSpinDismissed={postSpinDismissed}
        onPostSpinDismiss={handlePostSpinDismiss}
        onClaimComplete={handleClaimComplete}
        onSpinBlockedChange={setSpinBlocked}
      />
    </>
  );
}
