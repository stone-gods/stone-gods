function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function devEnvFlag(name: string): boolean {
  return process.env[name] === "true";
}

export function isDevUnlimitedSpins(): boolean {
  return !isProduction() && devEnvFlag("DEV_UNLIMITED_SPINS");
}

/** Dev: every spin resolves as NFT_WIN (for testing claim / celebration flow). */
export function isDevForceWin(): boolean {
  return !isProduction() && devEnvFlag("DEV_FORCE_WIN");
}
