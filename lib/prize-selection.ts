import { randomInt } from "crypto";
import { isMockNftClaimEnabled } from "@/lib/prize-wallet-env";
import { fetchEligiblePrizeNfts, getMockPrizeInventory } from "@/lib/prize-inventory";
import type { PrizeInfo } from "@/types/game";

export function selectRandomPrizeFromInventory(
  inventory: readonly PrizeInfo[],
  reservedMintAddresses: ReadonlySet<string>,
): PrizeInfo | null {
  const available = inventory.filter((prize) => !reservedMintAddresses.has(prize.mintAddress));
  if (available.length === 0) return null;

  return available[randomInt(0, available.length)]!;
}

export async function selectRandomPrizeNft(
  ownerAddress: string,
  rpcUrl: string,
  reservedMintAddresses: ReadonlySet<string>,
): Promise<PrizeInfo | null> {
  const inventory = isMockNftClaimEnabled()
    ? getMockPrizeInventory()
    : await fetchEligiblePrizeNfts(ownerAddress, rpcUrl);

  return selectRandomPrizeFromInventory(inventory, reservedMintAddresses);
}
