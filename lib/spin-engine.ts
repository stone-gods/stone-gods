import { randomInt } from "crypto";
import type { SpinOutcome } from "@/app/generated/prisma/client";
import {
  COMMON_SYMBOLS,
  GOD_SYMBOLS,
  PAYLINE_INDEX,
} from "@/lib/symbols";
import type { ReelGrid, SpinResult, SymbolId } from "@/types/game";

const NFT_WIN_THRESHOLD = 100; // 100 / 10_000 = 1% target

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
  if (roll < NFT_WIN_THRESHOLD && options.canAwardWin) {
    return "NFT_WIN";
  }
  return "LOSS";
}

function pickRandom<T>(items: readonly T[], random = randomInt): T {
  return items[random(0, items.length)]!;
}

function pickCommon(random = randomInt): SymbolId {
  return pickRandom(COMMON_SYMBOLS, random);
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
  const resolvedOutcome = outcome === "NEAR_MISS" ? "LOSS" : outcome;
  const reels =
    resolvedOutcome === "NFT_WIN" ? generateWinReels(random) : generateLossReels(random);

  assertReelsMatchOutcome(resolvedOutcome, reels);
  return { outcome: resolvedOutcome, reels };
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
  prize?: { name: string; number: string | null } | null,
): string {
  switch (outcome) {
    case "NFT_WIN":
      if (prize) {
        if (prize.name.includes("#")) return `You won ${prize.name}!`;
        return prize.number
          ? `You won ${prize.name} #${prize.number}!`
          : `You won ${prize.name}!`;
      }
      return "You won an NFT!";
    case "NEAR_MISS":
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
