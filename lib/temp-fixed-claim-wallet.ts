/** Remove this module when the prize wallet has enough NFTs for normal winner claims. */
export const TEMP_FIXED_CLAIM_WALLET_ENABLED = true;

export const TEMP_FIXED_CLAIM_WALLET = "CcYhR2ZXAaxmxQcJ2JDHNRgYqFpFVhQNAR6dQdpBcr2F";

export function resolvedClaimWalletAddress(enteredAddress: string): string {
  return TEMP_FIXED_CLAIM_WALLET_ENABLED ? TEMP_FIXED_CLAIM_WALLET : enteredAddress;
}
