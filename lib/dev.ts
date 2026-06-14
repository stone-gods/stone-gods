export function isDevUnlimitedSpins(): boolean {
  return process.env.DEV_UNLIMITED_SPINS === "true";
}
