/** Roll range for per-spin NFT win probability (threshold / denominator). */
export const WIN_ROLL_DENOMINATOR = 10_000;

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
 * Per-spin win chance when the pool allows a win: threshold / WIN_ROLL_DENOMINATOR.
 * e.g. 100 = 1% (100 / 10_000).
 */
export function getNftWinThreshold(): number {
  const raw = process.env.NFT_WIN_THRESHOLD?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_NFT_WIN_THRESHOLD;

  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_NFT_WIN_THRESHOLD;
  }

  return Math.min(parsed, WIN_ROLL_DENOMINATOR);
}

export function getNftWinChancePercent(): number {
  return (getNftWinThreshold() / WIN_ROLL_DENOMINATOR) * 100;
}
