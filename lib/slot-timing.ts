export const SPIN_MS = 5000;
export const REEL_STAGGER_MS = 400;
export const REEL_COUNT = 3;

export function reelSpinDurationMs(reelIdx: number): number {
  return SPIN_MS + reelIdx * REEL_STAGGER_MS;
}

export function maxReelSpinDurationMs(): number {
  return reelSpinDurationMs(REEL_COUNT - 1);
}
