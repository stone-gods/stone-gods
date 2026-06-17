"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import StoneDrumSurface from "@/components/StoneDrumSurface";
import ReelSpinSound from "@/components/ReelSpinSound";
import ReelSymbol from "@/components/ReelSymbol";
import { playReelStopSound, preloadReelStopSound } from "@/lib/reel-audio";
import { ALL_SYMBOLS, PAYLINE_INDEX } from "@/lib/symbols";
import type { ReelGrid, SpinApiResponse, SpinStatusResponse, SymbolId } from "@/types/game";

const VISIBLE = 3;
const SPIN_MS = 5000;
const REEL_STAGGER_MS = 400;
const SPIN_CRUISE_DIST = 0.996;

function reelSpinDuration(reelIdx: number): number {
  return SPIN_MS + reelIdx * REEL_STAGGER_MS;
}
const STRIP_FILLER_COUNT = 68;

function buildStrip(column: [SymbolId, SymbolId, SymbolId]): SymbolId[] {
  const filler = ALL_SYMBOLS.filter((s) => !column.includes(s));
  const strip: SymbolId[] = [];
  for (let i = 0; i < STRIP_FILLER_COUNT; i++) {
    strip.push(filler[i % filler.length] ?? ALL_SYMBOLS[i % 7]!);
  }
  return [...strip, ...column];
}

function stripOffset(strip: SymbolId[], faceH: number): number {
  return (strip.length - VISIBLE) * faceH;
}

type SlotMachineProps = {
  onSpinComplete?: (result: SpinApiResponse) => void;
  spinDisabled?: boolean;
  celebratingWin?: boolean;
};

export default function SlotMachine({
  onSpinComplete,
  spinDisabled = false,
  celebratingWin = false,
}: SlotMachineProps) {
  const [reels, setReels] = useState<ReelGrid>([
    ["RUNE_BLUE", "STONE", "ARTIFACT_BLUE"],
    ["ARTIFACT_ORANGE", "GOD_1", "RUNE_GREEN"],
    ["ARTIFACT_BLUE", "GOD_2", "RUNE_BLUE"],
  ]);
  const [offsets, setOffsets] = useState([0, 0, 0]);
  const [faceH, setFaceH] = useState(88);
  const [stripAnimating, setStripAnimating] = useState([false, false, false]);
  const [spinning, setSpinning] = useState(false);
  const pendingSpinRef = useRef<SpinApiResponse | null>(null);
  const reelsWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = reelsWrapRef.current;
    if (!el) return;

    const syncFaceH = () => {
      const h = el.clientHeight / VISIBLE;
      if (h > 0) setFaceH(h);
    };

    syncFaceH();
    const ro = new ResizeObserver(syncFaceH);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    preloadReelStopSound();
  }, []);

  function onStripAnimationEnd(reelIdx: number, e: React.AnimationEvent<HTMLDivElement>) {
    if (e.animationName !== "reel-spin" || e.target !== e.currentTarget) return;

    playReelStopSound();

    setStripAnimating((prev) => {
      const next = [...prev];
      next[reelIdx] = false;
      if (next.every((active) => !active)) {
        setSpinning(false);

        const completed = pendingSpinRef.current;
        if (completed) {
          pendingSpinRef.current = null;
          onSpinComplete?.(completed);
        }
      }
      return next;
    });
  }

  const syncFromApi = useCallback(async () => {
    const res = await fetch("/api/spin");
    if (!res.ok) return;
    const data = (await res.json()) as SpinStatusResponse;
    if (data.lastSpin?.reels) {
      const grid = data.lastSpin.reels;
      setReels(grid);
      setOffsets(grid.map((col) => stripOffset(buildStrip(col), faceH)));
    }
  }, [faceH]);

  useEffect(() => {
    void syncFromApi();
  }, [syncFromApi]);

  async function handleSpin() {
    if (spinning || spinDisabled) return;

    setSpinning(true);
    pendingSpinRef.current = null;

    setStripAnimating([false, false, false]);
    setOffsets([0, 0, 0]);

    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));

    const scrollTarget = stripOffset(buildStrip(reels[0]!), faceH);
    setStripAnimating([true, true, true]);
    setOffsets(reels.map(() => scrollTarget));

    try {
      const res = await fetch("/api/spin", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setStripAnimating([false, false, false]);
        setSpinning(false);
        return;
      }

      const spin = data as SpinApiResponse;
      setReels(spin.reels);
      pendingSpinRef.current = spin;
    } catch {
      setStripAnimating([false, false, false]);
      setSpinning(false);
    }
  }

  return (
    <div className={`slot slot--layered${celebratingWin ? " slot--win-celebration" : ""}`}>
      <ReelSpinSound spinning={spinning} />
      <svg className="slot__defs" aria-hidden width="0" height="0">
        <defs>
          <clipPath id="reel-barrel" clipPathUnits="objectBoundingBox">
            <path d="M 0.08 0 L 0.92 0 C 0.97 0 1 0.1 1 0.5 C 1 0.9 0.97 1 0.92 1 L 0.08 1 C 0.03 1 0 0.9 0 0.5 C 0 0.1 0.03 0 0.08 0 Z" />
          </clipPath>
        </defs>
      </svg>

      <div className="slot__reels-layer">
        <div className="slot__reels-wrap" ref={reelsWrapRef}>
          <div className="slot__display">
            <div className="slot__reels">
              {reels.map((column, reelIdx) => {
                const strip = buildStrip(column);
                const isAnimating = stripAnimating[reelIdx];
                const scrollY = offsets[reelIdx] ?? 0;
                const duration = reelSpinDuration(reelIdx);
                const visibleStart = strip.length - VISIBLE;
                return (
                  <div key={reelIdx} className="slot__reel-unit">
                    {reelIdx > 0 && <div className="slot__reel-gap" aria-hidden />}
                    <div className="slot__reel-drum">
                      <div className="slot__drum-body">
                        <div
                          className={`slot__strip${isAnimating ? " is-animating" : ""}`}
                          onAnimationEnd={(e) => onStripAnimationEnd(reelIdx, e)}
                          style={
                            isAnimating
                              ? {
                                  ["--reel-scroll-y" as string]: `-${scrollY}px`,
                                  ["--reel-scroll-cruise" as string]: `-${scrollY * SPIN_CRUISE_DIST}px`,
                                  ["--reel-duration" as string]: `${duration}ms`,
                                }
                              : {
                                  transform: `translate3d(0, -${scrollY}px, 0)`,
                                }
                          }
                        >
                          <div className="slot__strip-stone" aria-hidden>
                            <StoneDrumSurface reelIdx={reelIdx} height={strip.length * faceH} />
                          </div>
                          {strip.map((symbolId, i) => {
                            const rowInWindow = i - visibleStart;
                            const isPaylineWin =
                              celebratingWin &&
                              rowInWindow >= 0 &&
                              rowInWindow < VISIBLE &&
                              rowInWindow === PAYLINE_INDEX;

                            return (
                              <div
                                key={i}
                                className={`slot__drum-segment${
                                  isPaylineWin ? " slot__drum-segment--payline-win" : ""
                                }`}
                                style={
                                  isPaylineWin
                                    ? ({ ["--win-reel-delay" as string]: `${reelIdx * 0.12}s` } as CSSProperties)
                                    : undefined
                                }
                              >
                                <ReelSymbol symbolId={symbolId} />
                              </div>
                            );
                          })}
                        </div>
                        <div className="slot__drum-rim" aria-hidden />
                        <div className="slot__drum-shade" aria-hidden />
                        <div className="slot__drum-edge" aria-hidden />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="game-frame-wrap" aria-hidden>
        <img
          className="game-frame"
          src="/assets/stone-gods-frame.png"
          alt=""
          draggable={false}
        />
      </div>

      <div className="slot__ui-layer">
        <div className="slot__actions slot__actions--single">
          <button
            type="button"
            className="slot__spin"
            onClick={() => void handleSpin()}
            disabled={spinning || spinDisabled}
          >
            {spinning ? "…" : "SPIN"}
          </button>
        </div>
      </div>
    </div>
  );
}
