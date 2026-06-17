import { getWinPoolSize } from "@/lib/game-odds";

/**
 * Before spin N+1, `completedSpinCount` = N finished spins globally.
 * At most one NFT win per block of WIN_POOL_SIZE spins.
 */
export function canAwardNftWin(
  completedSpinCount: number,
  nftWinCount: number,
  poolSize = getWinPoolSize(),
): boolean {
  const maxWinsAllowed = Math.floor(completedSpinCount / poolSize) + 1;
  return nftWinCount < maxWinsAllowed;
}
