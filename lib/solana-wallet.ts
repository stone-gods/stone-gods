import { PublicKey } from "@solana/web3.js";

export function isValidSolanaWalletAddress(address: string): boolean {
  const trimmed = address.trim();
  if (!trimmed) return false;

  try {
    const key = new PublicKey(trimmed);
    return PublicKey.isOnCurve(key.toBytes());
  } catch {
    return false;
  }
}

export function normalizeSolanaWalletAddress(address: string): string {
  return new PublicKey(address.trim()).toBase58();
}
