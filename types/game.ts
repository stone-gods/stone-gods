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
};

export type SpinStatusResponse = {
  canSpin: boolean;
  spinsRemaining: number;
  dailySpinLimit: number;
  nextSpinAt: string | null;
  uncollectedWin: {
    spinId: string;
  } | null;
  lastSpin: {
    spinId: string;
    outcome: SpinOutcome;
    reels: ReelGrid;
    createdAt: string;
  } | null;
};

export type ClaimApiResponse = {
  spinId: string;
  walletAddress: string;
  txSignature: string;
  message: string;
};
