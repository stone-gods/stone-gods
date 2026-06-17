import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/game-session";
import { fetchEligiblePrizeNfts, getMockPrizeInventory } from "@/lib/prize-inventory";
import { getPrizeWalletEnv, isMockNftClaimEnabled } from "@/lib/prize-wallet-env";
import { formatPrizeDisplayName, type PrizeInfo } from "@/types/game";

export const runtime = "nodejs";

function sortPrizes(prizes: PrizeInfo[]): PrizeInfo[] {
  return [...prizes].sort((a, b) =>
    formatPrizeDisplayName(a).localeCompare(formatPrizeDisplayName(b), undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

export async function GET() {
  const userId = await requireAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  try {
    if (isMockNftClaimEnabled()) {
      return NextResponse.json({ prizes: sortPrizes(getMockPrizeInventory()) });
    }

    const env = getPrizeWalletEnv();
    if (!env) {
      return NextResponse.json({ error: "Prize wallet not configured" }, { status: 503 });
    }

    const prizes = sortPrizes(await fetchEligiblePrizeNfts(env.walletAddress, env.rpcUrl));
    return NextResponse.json({ prizes });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load prizes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
