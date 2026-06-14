export function isDevUnlimitedSpins(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.DEV_UNLIMITED_SPINS === "true"
  );
}
