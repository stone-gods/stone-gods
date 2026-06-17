import { randomInt } from "crypto";
import { isMockNftClaimEnabled } from "@/lib/prize-wallet-env";
import { fetchEligiblePrizeNfts, getMockPrizeInventory } from "@/lib/prize-inventory";
import type { PrizeInfo } from "@/types/game";

export async function selectRandomPrizeNft(
  ownerAddress: string,
  rpcUrl: string,
  reservedMintAddresses: ReadonlySet<string>,
): Promise<PrizeInfo | null> {
  const inventory = isMockNftClaimEnabled()
    ? getMockPrizeInventory()
    : await fetchEligiblePrizeNfts(ownerAddress, rpcUrl);

  const available = inventory.filter((prize) => !reservedMintAddresses.has(prize.mintAddress));
  if (available.length === 0) return null;

  return available[randomInt(0, available.length)]!;
}
