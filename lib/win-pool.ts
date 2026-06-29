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

/**
 * Guarantee one win in each pool window if random rolls never hit.
 * e.g. pool size 10 → the 10th global spin wins if none yet in that window.
 */
export function shouldForceWinInWindow(
  completedSpinCount: number,
  nftWinCount: number,
  poolSize = getWinPoolSize(),
): boolean {
  if (!canAwardNftWin(completedSpinCount, nftWinCount, poolSize)) {
    return false;
  }

  const isLastSpinInWindow = completedSpinCount % poolSize === poolSize - 1;
  const winsInPriorFullWindows = Math.floor(completedSpinCount / poolSize);
  // Use <= so a prior window that ended with 0 wins (e.g. empty prize pool) still forces.
  const noWinYetThisWindow = nftWinCount <= winsInPriorFullWindows;

  return isLastSpinInWindow && noWinYetThisWindow;
}
