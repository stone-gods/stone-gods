export function solanaTxExplorerUrl(signature: string): string {
  return `https://solscan.io/tx/${signature}`;
}

export function isMockTxSignature(signature: string): boolean {
  return signature.startsWith("mock-");
}
