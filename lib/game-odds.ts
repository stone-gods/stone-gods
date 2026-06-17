const DEFAULT_WIN_POOL_SIZE = 100;
const DEFAULT_NFT_WIN_THRESHOLD = 100;

/**
 * Global spins per allowed NFT win (hard cap).
 * e.g. 100 = at most one winner per 100 completed spins worldwide.
 */
export function getWinPoolSize(): number {
  const raw = process.env.WIN_POOL_SIZE?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_WIN_POOL_SIZE;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_WIN_POOL_SIZE;
}

/**
 * Per-spin win chance when the pool allows a win: 1 in N.
 * e.g. 10 = 10% per spin, 100 = 1% per spin.
 */
export function getNftWinThreshold(): number {
  const raw = process.env.NFT_WIN_THRESHOLD?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_NFT_WIN_THRESHOLD;

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_NFT_WIN_THRESHOLD;
  }

  return parsed;
}

export function getNftWinChancePercent(): number {
  return 100 / getNftWinThreshold();
}
