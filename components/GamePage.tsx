"use client";

import { useEffect, useState } from "react";
import GameShell from "@/components/GameShell";
import GameLoadingScreen from "@/components/GameLoadingScreen";
import { CRITICAL_GAME_IMAGES } from "@/lib/game-assets";
import { preloadImages } from "@/lib/preload-images";

const LOADER_EXIT_MS = 450;

export default function GamePage() {
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
    if (!assetsReady) return;

    const timer = window.setTimeout(() => setShowLoader(false), LOADER_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [assetsReady]);

  return (
    <main className="game-viewport">
      {showLoader ? <GameLoadingScreen exiting={assetsReady} /> : null}
      <div className={`game-stage${assetsReady ? " game-stage--ready" : ""}`}>
        {assetsReady ? <GameShell /> : null}
      </div>
    </main>
  );
}
