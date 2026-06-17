import type { Prisma } from "@/app/generated/prisma/client";
import { getPrizeWalletEnv, isMockNftClaimEnabled } from "@/lib/prize-wallet-env";
import { selectRandomPrizeNft } from "@/lib/prize-selection";
import type { PrizeInfo } from "@/types/game";

type SpinTx = Prisma.TransactionClient;

export async function loadReservedPrizeMints(tx: SpinTx): Promise<Set<string>> {
  const rows = await tx.spin.findMany({
    where: {
      outcome: "NFT_WIN",
      prizeMintAddress: { not: null },
    },
    select: { prizeMintAddress: true },
  });

  return new Set(
    rows
      .map((row) => row.prizeMintAddress)
      .filter((mint): mint is string => Boolean(mint)),
  );
}

export async function assignPrizeForWin(tx: SpinTx): Promise<PrizeInfo | null> {
  const walletEnv = isMockNftClaimEnabled()
    ? {
        walletAddress: getPrizeWalletEnv()?.walletAddress ?? "mock-prize-wallet",
        rpcUrl: getPrizeWalletEnv()?.rpcUrl ?? "mock",
      }
    : getPrizeWalletEnv();

  if (!walletEnv) return null;

  const reservedMints = await loadReservedPrizeMints(tx);
  return selectRandomPrizeNft(walletEnv.walletAddress, walletEnv.rpcUrl, reservedMints);
}

export function prizeFieldsFromInfo(prize: PrizeInfo) {
  return {
    prizeMintAddress: prize.mintAddress,
    prizeName: prize.name,
    prizeImageUrl: prize.imageUrl,
    prizeNumber: prize.number,
  };
}
