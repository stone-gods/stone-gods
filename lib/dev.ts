function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function devEnvFlag(name: string): boolean {
  return process.env[name] === "true";
}

/** Set ALLOW_DEV_FLAGS_IN_PRODUCTION=true to enable dev flags on Vercel (testing only — remove before launch). */
function devFlagsAllowed(): boolean {
  return !isProduction() || devEnvFlag("ALLOW_DEV_FLAGS_IN_PRODUCTION");
}

export function isDevUnlimitedSpins(): boolean {
  return devFlagsAllowed() && devEnvFlag("DEV_UNLIMITED_SPINS");
}

/** Dev: every spin resolves as NFT_WIN (for testing claim / celebration flow). */
export function isDevForceWin(): boolean {
  return devFlagsAllowed() && devEnvFlag("DEV_FORCE_WIN");
}
