"use client";

import { useEffect, useState } from "react";
import GameShell from "@/components/GameShell";
import GameLoadingScreen from "@/components/GameLoadingScreen";
import RotateDeviceScreen from "@/components/RotateDeviceScreen";
import { CRITICAL_GAME_IMAGES } from "@/lib/game-assets";
import { preloadImages } from "@/lib/preload-images";
import { useIsPortrait } from "@/lib/use-is-portrait";

const LOADER_EXIT_MS = 450;

export default function GamePage() {
  const isPortrait = useIsPortrait();
  const [assetsReady, setAssetsReady] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      await Promise.all([
        preloadImages(CRITICAL_GAME_IMAGES),
        typeof document !== "undefined" && document.fonts?.ready
          ? document.fonts.ready
          : Promise.resolve(),
      ]);

      if (!cancelled) setAssetsReady(true);
    }

    void prepare();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!assetsReady || isPortrait) return;

    const timer = window.setTimeout(() => setShowLoader(false), LOADER_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [assetsReady, isPortrait]);

  useEffect(() => {
    if (isPortrait) setShowLoader(true);
  }, [isPortrait]);

  if (isPortrait) {
    return (
      <main className="game-viewport">
        <RotateDeviceScreen />
      </main>
    );
  }

  return (
    <main className="game-viewport">
      {showLoader ? <GameLoadingScreen exiting={assetsReady} /> : null}
      <div className={`game-stage${assetsReady ? " game-stage--ready" : ""}`}>
        {assetsReady ? <GameShell /> : null}
      </div>
    </main>
  );
}
