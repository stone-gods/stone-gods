export function isDevUnlimitedSpins(): boolean {
  return process.env.DEV_UNLIMITED_SPINS === "true";
}

/** Dev: every spin resolves as NFT_WIN (for testing claim / celebration flow). */
export function isDevForceWin(): boolean {
  return process.env.DEV_FORCE_WIN === "true";
}
