/** Written to claimTxSignature while an on-chain transfer is in flight. */
export const CLAIM_TX_PENDING = "__pending__";

export function isClaimTxPending(signature: string | null | undefined): boolean {
  return signature === CLAIM_TX_PENDING;
}
