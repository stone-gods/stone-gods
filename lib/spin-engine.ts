import { randomInt } from "crypto";
import type { SpinOutcome } from "@/app/generated/prisma/client";
import {
  COMMON_SYMBOLS,
  GOD_SYMBOLS,
  PAYLINE_INDEX,
} from "@/lib/symbols";
import type { ReelGrid, SpinResult, SymbolId } from "@/types/game";

const NFT_WIN_THRESHOLD = 100; // 100 / 10_000 = 1%
const NEAR_MISS_THRESHOLD = 600; // 500 / 10_000 = 5% additional near misses

export function rollOutcome(random = randomInt): SpinOutcome {
  const roll = random(0, 10_000);
  if (roll < NFT_WIN_THRESHOLD) return "NFT_WIN";
  if (roll < NEAR_MISS_THRESHOLD) return "NEAR_MISS";
  return "LOSS";
}

function pickRandom<T>(items: readonly T[], random = randomInt): T {
  return items[random(0, items.length)]!;
}

function pickCommon(random = randomInt): SymbolId {
  return pickRandom(COMMON_SYMBOLS, random);
}

function pickNonMatchingGod(exclude: SymbolId, random = randomInt): SymbolId {
  const options = GOD_SYMBOLS.filter((s) => s !== exclude);
  return pickRandom(options.length > 0 ? options : GOD_SYMBOLS, random);
}

function buildReelColumn(
  top: SymbolId,
  center: SymbolId,
  bottom: SymbolId,
): [SymbolId, SymbolId, SymbolId] {
  return [top, center, bottom];
}

function generateWinReels(random = randomInt): ReelGrid {
  const winningGod = pickRandom(GOD_SYMBOLS, random);
  return [
    buildReelColumn(pickCommon(random), winningGod, pickCommon(random)),
    buildReelColumn(pickCommon(random), winningGod, pickCommon(random)),
    buildReelColumn(pickCommon(random), winningGod, pickCommon(random)),
  ];
}

function generateNearMissReels(random = randomInt): ReelGrid {
  const winningGod = pickRandom(GOD_SYMBOLS, random);
  const missReel = random(0, 3);
  const missSymbol =
    random(0, 2) === 0
      ? pickNonMatchingGod(winningGod, random)
      : pickCommon(random);

  const reels: ReelGrid = [
    buildReelColumn(pickCommon(random), winningGod, pickCommon(random)),
    buildReelColumn(pickCommon(random), winningGod, pickCommon(random)),
    buildReelColumn(pickCommon(random), winningGod, pickCommon(random)),
  ];

  reels[missReel] = buildReelColumn(
    pickCommon(random),
    missSymbol,
    pickCommon(random),
  );

  return reels;
}

function paylineHasThreeGods(reels: ReelGrid): boolean {
  const payline = reels.map((reel) => reel[PAYLINE_INDEX]);
  return payline.every((symbol) => GOD_SYMBOLS.includes(symbol));
}

function generateLossReels(random = randomInt): ReelGrid {
  for (let attempt = 0; attempt < 50; attempt++) {
    const reels: ReelGrid = [
      buildReelColumn(pickCommon(random), pickCommon(random), pickCommon(random)),
      buildReelColumn(pickCommon(random), pickCommon(random), pickCommon(random)),
      buildReelColumn(pickCommon(random), pickCommon(random), pickCommon(random)),
    ];

    if (!paylineHasThreeGods(reels)) {
      return reels;
    }
  }

  return [
    buildReelColumn("RUNE_BLUE", "RUNE_GREEN", "STONE"),
    buildReelColumn("STONE", "ARTIFACT_BLUE", "RUNE_BLUE"),
    buildReelColumn("ARTIFACT_ORANGE", "RUNE_GREEN", "STONE"),
  ];
}

export function generateSpin(
  outcome: SpinOutcome,
  random = randomInt,
): SpinResult {
  const reels =
    outcome === "NFT_WIN"
      ? generateWinReels(random)
      : outcome === "NEAR_MISS"
        ? generateNearMissReels(random)
        : generateLossReels(random);

  return { outcome, reels };
}

export function resolveSpin(random = randomInt): SpinResult {
  const outcome = rollOutcome(random);
  return generateSpin(outcome, random);
}

export function outcomeMessage(
  outcome: SpinOutcome,
  unlimited = false,
): string {
  switch (outcome) {
    case "NFT_WIN":
      return "You won a Stone God NFT!";
    case "NEAR_MISS":
      return unlimited ? "So close!" : "So close! Try again tomorrow.";
    case "LOSS":
      return unlimited
        ? "No win this time."
        : "No win this time. Come back tomorrow for another spin.";
  }
}

/** Dev helper: measure win rate over N simulated spins. */
export function simulateWinRate(spins: number, random = randomInt): number {
  let wins = 0;
  for (let i = 0; i < spins; i++) {
    if (rollOutcome(random) === "NFT_WIN") wins++;
  }
  return wins / spins;
}
