import type { SpinOutcome } from "@/app/generated/prisma/client";

export type { SpinOutcome };

export type SymbolId =
  | "RUNE_BLUE"
  | "RUNE_GREEN"
  | "STONE"
  | "ARTIFACT_ORANGE"
  | "ARTIFACT_BLUE"
  | "GOD_1"
  | "GOD_2";

/** Three reels; each reel is [top, center, bottom]. Payline = center row. */
export type ReelGrid = [SymbolId, SymbolId, SymbolId][];

export type PrizeInfo = {
  mintAddress: string;
  name: string;
  imageUrl: string;
  number: string | null;
};

export type SpinResult = {
  outcome: SpinOutcome;
  reels: ReelGrid;
};

export type SpinApiResponse = {
  spinId: string;
  outcome: SpinOutcome;
  reels: ReelGrid;
  canSpinAgainAt: string | null;
  spinsRemaining?: number;
  message: string;
  prize?: PrizeInfo | null;
};

export type SpinStatusResponse = {
  canSpin: boolean;
  spinsRemaining: number;
  dailySpinLimit: number;
  nextSpinAt: string | null;
  uncollectedWin: {
    spinId: string;
    prize: PrizeInfo;
  } | null;
  lastSpin: {
    spinId: string;
    outcome: SpinOutcome;
    reels: ReelGrid;
    createdAt: string;
    prize?: PrizeInfo | null;
  } | null;
};

export type ClaimApiResponse = {
  spinId: string;
  walletAddress: string;
  txSignature: string;
  message: string;
  prize: PrizeInfo;
};

export function formatPrizeDisplayName(prize: PrizeInfo): string {
  if (!prize.number || prize.name.includes("#")) return prize.name;
  return `${prize.name} #${prize.number}`;
}

export function prizeSentMessage(prize: PrizeInfo): string {
  return `${formatPrizeDisplayName(prize)} sent to your wallet!`;
}

export function prizeInfoFromSpin(spin: {
  prizeMintAddress: string | null;
  prizeName: string | null;
  prizeImageUrl: string | null;
  prizeNumber: string | null;
}): PrizeInfo | null {
  if (!spin.prizeMintAddress || !spin.prizeName || !spin.prizeImageUrl) {
    return null;
  }

  return {
    mintAddress: spin.prizeMintAddress,
    name: spin.prizeName,
    imageUrl: spin.prizeImageUrl,
    number: spin.prizeNumber,
  };
}
