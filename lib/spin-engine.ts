import { randomInt } from "crypto";
import type { SpinOutcome } from "@/app/generated/prisma/client";
import {
  COMMON_SYMBOLS,
  GOD_SYMBOLS,
  PAYLINE_INDEX,
} from "@/lib/symbols";
import type { ReelGrid, SpinResult, SymbolId } from "@/types/game";

const NFT_WIN_THRESHOLD = 100; // 100 / 10_000 = 1% target
const NEAR_MISS_THRESHOLD = 600; // 500 / 10_000 = 5% additional near misses

export function paylineSymbols(reels: ReelGrid): [SymbolId, SymbolId, SymbolId] {
  return [
    reels[0]![PAYLINE_INDEX],
    reels[1]![PAYLINE_INDEX],
    reels[2]![PAYLINE_INDEX],
  ];
}

/** Three identical symbols on the center payline (what the player sees as a "match"). */
export function paylineHasThreeMatching(reels: ReelGrid): boolean {
  const [a, b, c] = paylineSymbols(reels);
  return a === b && b === c;
}

export function paylineHasThreeGods(reels: ReelGrid): boolean {
  return paylineSymbols(reels).every((symbol) => GOD_SYMBOLS.includes(symbol));
}

export function rollOutcome(
  options: { canAwardWin: boolean },
  random = randomInt,
): SpinOutcome {
  const roll = random(0, 10_000);
  if (roll < NFT_WIN_THRESHOLD) {
    return options.canAwardWin ? "NFT_WIN" : "NEAR_MISS";
  }
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

function generateLossReels(random = randomInt): ReelGrid {
  for (let attempt = 0; attempt < 100; attempt++) {
    const reels: ReelGrid = [
      buildReelColumn(pickCommon(random), pickCommon(random), pickCommon(random)),
      buildReelColumn(pickCommon(random), pickCommon(random), pickCommon(random)),
      buildReelColumn(pickCommon(random), pickCommon(random), pickCommon(random)),
    ];

    if (!paylineHasThreeMatching(reels)) {
      return reels;
    }
  }

  // Guaranteed no triple match on payline
  return [
    buildReelColumn("RUNE_BLUE", "RUNE_GREEN", "STONE"),
    buildReelColumn("STONE", "ARTIFACT_BLUE", "RUNE_BLUE"),
    buildReelColumn("ARTIFACT_ORANGE", "RUNE_GREEN", "STONE"),
  ];
}

function assertReelsMatchOutcome(outcome: SpinOutcome, reels: ReelGrid): void {
  const triple = paylineHasThreeMatching(reels);
  const tripleGods = paylineHasThreeGods(reels);

  if (outcome === "NFT_WIN" && !tripleGods) {
    throw new Error("NFT_WIN reels must show three Stone Gods on the payline");
  }
  if (outcome !== "NFT_WIN" && triple) {
    throw new Error(`${outcome} reels must not show three matching payline symbols`);
  }
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

  assertReelsMatchOutcome(outcome, reels);
  return { outcome, reels };
}

export function resolveSpin(
  options?: { canAwardWin?: boolean },
  random = randomInt,
): SpinResult {
  const canAwardWin = options?.canAwardWin ?? true;
  const outcome = rollOutcome({ canAwardWin }, random);
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

/** Dev helper: measure win rate over N simulated spins (ignores global pool). */
export function simulateWinRate(spins: number, random = randomInt): number {
  let wins = 0;
  for (let i = 0; i < spins; i++) {
    if (rollOutcome({ canAwardWin: true }, random) === "NFT_WIN") wins++;
  }
  return wins / spins;
}

/** Dev helper: simulate with global win-pool cap enforced. */
export function simulateWinRateWithPool(
  spins: number,
  random = randomInt,
): { rate: number; maxWinsInWindow: number } {
  let wins = 0;
  let maxWinsInWindow = 0;
  let windowWins = 0;

  for (let i = 0; i < spins; i++) {
    if (i > 0 && i % 100 === 0) {
      maxWinsInWindow = Math.max(maxWinsInWindow, windowWins);
      windowWins = 0;
    }

    const canAwardWin = wins < Math.floor(i / 100) + 1;
    const outcome = rollOutcome({ canAwardWin }, random);
    if (outcome === "NFT_WIN") {
      wins++;
      windowWins++;
    }
  }

  maxWinsInWindow = Math.max(maxWinsInWindow, windowWins);
  return { rate: wins / spins, maxWinsInWindow };
}
