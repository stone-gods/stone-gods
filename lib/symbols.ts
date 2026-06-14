import type { SymbolId } from "@/types/game";

const V = "9";

export const SYMBOL_IMAGES: Record<SymbolId, string> = {
  RUNE_BLUE: `/assets/symbols/blue-gem.png?v=${V}`,
  RUNE_GREEN: `/assets/symbols/gold-coin.png?v=${V}`,
  STONE: `/assets/symbols/stone-face.png?v=${V}`,
  ARTIFACT_ORANGE: `/assets/symbols/wolf-warrior.png?v=${V}`,
  ARTIFACT_BLUE: `/assets/symbols/amber-gem.png?v=${V}`,
  GOD_1: `/assets/symbols/stone-god.png?v=${V}`,
  GOD_2: `/assets/symbols/stone-god.png?v=${V}`,
};

export const SYMBOLS: Record<
  SymbolId,
  { label: string; tier: "common" | "uncommon" | "rare"; image: string }
> = {
  RUNE_BLUE: { label: "Blue Gem", tier: "common", image: SYMBOL_IMAGES.RUNE_BLUE },
  RUNE_GREEN: { label: "Gold Coin", tier: "common", image: SYMBOL_IMAGES.RUNE_GREEN },
  STONE: { label: "Stone Face", tier: "common", image: SYMBOL_IMAGES.STONE },
  ARTIFACT_ORANGE: {
    label: "Wolf Warrior",
    tier: "uncommon",
    image: SYMBOL_IMAGES.ARTIFACT_ORANGE,
  },
  ARTIFACT_BLUE: {
    label: "Amber Gem",
    tier: "uncommon",
    image: SYMBOL_IMAGES.ARTIFACT_BLUE,
  },
  GOD_1: { label: "Stone God", tier: "rare", image: SYMBOL_IMAGES.GOD_1 },
  GOD_2: { label: "Stone God", tier: "rare", image: SYMBOL_IMAGES.GOD_2 },
};

export const COMMON_SYMBOLS: SymbolId[] = [
  "RUNE_BLUE",
  "RUNE_GREEN",
  "STONE",
  "ARTIFACT_ORANGE",
  "ARTIFACT_BLUE",
];

export const GOD_SYMBOLS: SymbolId[] = ["GOD_1", "GOD_2"];

export const PAYLINE_INDEX = 1;

export const ALL_SYMBOLS: SymbolId[] = [
  "RUNE_BLUE",
  "RUNE_GREEN",
  "STONE",
  "ARTIFACT_ORANGE",
  "ARTIFACT_BLUE",
  "GOD_1",
  "GOD_2",
];

/** Default grid matching the baked-in background art (no overlay needed). */
export const DEFAULT_REELS: import("@/types/game").ReelGrid = [
  ["RUNE_BLUE", "STONE", "ARTIFACT_ORANGE"],
  ["ARTIFACT_ORANGE", "GOD_1", "RUNE_GREEN"],
  ["ARTIFACT_BLUE", "GOD_2", "RUNE_BLUE"],
];

export function reelsMatch(a: import("@/types/game").ReelGrid, b: import("@/types/game").ReelGrid): boolean {
  return a.every((col, i) => col.every((sym, j) => sym === b[i]![j]));
}
