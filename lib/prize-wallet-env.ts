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

  if (!rpcUrl || !privateKey) {
    return null;
  }

  try {
    const walletAddress = resolveWalletAddress(privateKey);
    new PublicKey(walletAddress);

    return { rpcUrl, walletAddress, privateKey };
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

export function requirePrizeWalletEnv(): PrizeWalletEnv {
  if (isMockNftClaimEnabled()) {
    return {
      rpcUrl: trim(process.env.SOLANA_RPC_URL) ?? "mock",
      walletAddress: trim(process.env.PRIZE_WALLET) ?? "mock-prize-wallet",
      privateKey: "mock",
    };
  }

  const env = getPrizeWalletEnv();
  if (!env) {
    throw new Error(
      "Prize wallet is not configured. Set SOLANA_RPC_URL, PRIZE_WALLET, and PRIZE_WALLET_PRIVATE_KEY.",
    );
  }

  return env;
}
