import { SYMBOL_IMAGES } from "@/lib/symbols";

/** Images required before revealing the game (frame + visible reel symbols + modal thumb). */
export const CRITICAL_GAME_IMAGES = [
  "/assets/stone-gods-frame.png",
  "/assets/stone-gods-thumb.png",
  ...new Set(Object.values(SYMBOL_IMAGES)),
] as const;
