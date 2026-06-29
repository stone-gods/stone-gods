import type { Prisma } from "@/app/generated/prisma/client";
import { CLAIM_TX_PENDING } from "@/lib/claim-pending";
import { fetchEligiblePrizeNftsCached, getMockPrizeInventory } from "@/lib/prize-inventory";
import { getPrizeWalletReadEnv, isMockNftClaimEnabled } from "@/lib/prize-wallet-env";
import { selectRandomPrizeFromInventory } from "@/lib/prize-selection";
import type { PrizeInfo } from "@/types/game";

type SpinTx = Prisma.TransactionClient;

/** Block mints tied to unclaimed wins or in-flight claims — not every historical win. */
export async function loadReservedPrizeMints(tx: SpinTx): Promise<Set<string>> {
  const rows = await tx.spin.findMany({
    where: {
      outcome: "NFT_WIN",
      prizeMintAddress: { not: null },
      OR: [{ collectedAt: null }, { claimTxSignature: CLAIM_TX_PENDING }],
    },
    select: { prizeMintAddress: true },
  });

  return new Set(
    rows
      .map((row) => row.prizeMintAddress)
      .filter((mint): mint is string => Boolean(mint)),
  );
}

/** Load prize inventory outside DB transactions (Helius can take 10–30s). */
export async function prefetchPrizeInventory(): Promise<PrizeInfo[] | null> {
  if (isMockNftClaimEnabled()) {
    return getMockPrizeInventory();
  }

  const walletEnv = getPrizeWalletReadEnv();
  if (!walletEnv) return null;

  return fetchEligiblePrizeNftsCached(walletEnv.walletAddress, walletEnv.rpcUrl);
}

export async function assignPrizeForWin(
  tx: SpinTx,
  inventory: PrizeInfo[] | null,
): Promise<PrizeInfo | null> {
  if (!inventory || inventory.length === 0) return null;

  const reservedMints = await loadReservedPrizeMints(tx);
  return selectRandomPrizeFromInventory(inventory, reservedMints);
}

export function prizeFieldsFromInfo(prize: PrizeInfo) {
  return {
    prizeMintAddress: prize.mintAddress,
    prizeName: prize.name,
    prizeImageUrl: prize.imageUrl,
    prizeNumber: prize.number,
  };
}
