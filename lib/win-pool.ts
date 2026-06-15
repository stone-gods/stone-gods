/** Max NFT wins allowed per this many global spins (hard cap). */
export const WIN_POOL_SIZE = 100;

/**
 * Before spin N+1, `completedSpinCount` = N finished spins globally.
 * At most one NFT win per block of WIN_POOL_SIZE spins.
 */
export function canAwardNftWin(
  completedSpinCount: number,
  nftWinCount: number,
): boolean {
  const maxWinsAllowed = Math.floor(completedSpinCount / WIN_POOL_SIZE) + 1;
  return nftWinCount < maxWinsAllowed;
}
