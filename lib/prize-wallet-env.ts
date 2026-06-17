import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

function trim(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v || undefined;
}

export type PrizeWalletEnv = {
  rpcUrl: string;
  walletAddress: string;
  privateKey: string;
  nftMintAddress: string;
};

function resolvePrivateKey(): string | undefined {
  return trim(process.env.PRIZE_WALLET_PRIVATE_KEY) ?? trim(process.env.TREASURY_PRIVATE_KEY);
}

function resolveWalletAddress(privateKey: string): string {
  const configured =
    trim(process.env.PRIZE_WALLET) ?? trim(process.env.TREASURY_WALLET);
  const derived = Keypair.fromSecretKey(bs58.decode(privateKey)).publicKey.toBase58();

  if (configured && configured !== derived) {
    throw new Error("PRIZE_WALLET does not match PRIZE_WALLET_PRIVATE_KEY");
  }

  return configured ?? derived;
}

export function getPrizeWalletEnv(): PrizeWalletEnv | null {
  const rpcUrl = trim(process.env.SOLANA_RPC_URL);
  const privateKey = resolvePrivateKey();
  const nftMintAddress = trim(process.env.NFT_MINT_ADDRESS);

  if (!rpcUrl || !privateKey || !nftMintAddress) {
    return null;
  }

  try {
    const walletAddress = resolveWalletAddress(privateKey);
    // Validate formats early so misconfiguration fails at claim time with a clear error.
    new PublicKey(walletAddress);
    new PublicKey(nftMintAddress);

    return { rpcUrl, walletAddress, privateKey, nftMintAddress };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid prize wallet configuration";
    throw new Error(message);
  }
}

export function isPrizeWalletConfigured(): boolean {
  try {
    return getPrizeWalletEnv() !== null;
  } catch {
    return false;
  }
}

export function isMockNftClaimEnabled(): boolean {
  return trim(process.env.MOCK_NFT_CLAIM)?.toLowerCase() === "true";
}
