function trim(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v || undefined;
}

export type TreasuryEnv = {
  rpcUrl: string;
  privateKey: string;
  nftMintAddress: string;
};

export function getTreasuryEnv(): TreasuryEnv | null {
  const rpcUrl = trim(process.env.SOLANA_RPC_URL);
  const privateKey = trim(process.env.TREASURY_PRIVATE_KEY);
  const nftMintAddress = trim(process.env.NFT_MINT_ADDRESS);

  if (!rpcUrl || !privateKey || !nftMintAddress) {
    return null;
  }

  return { rpcUrl, privateKey, nftMintAddress };
}

export function isTreasuryConfigured(): boolean {
  return getTreasuryEnv() !== null;
}

export function isMockNftClaimEnabled(): boolean {
  return trim(process.env.MOCK_NFT_CLAIM)?.toLowerCase() === "true";
}
