import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

function trim(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v || undefined;
}

function normalizeEnvValue(raw: string): string {
  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

export type PrizeWalletEnv = {
  rpcUrl: string;
  walletAddress: string;
  privateKey: string;
};

export type PrizeWalletReadEnv = {
  rpcUrl: string;
  walletAddress: string;
};

function keypairFromSecretBytes(bytes: Uint8Array): Keypair {
  if (bytes.length === 64) {
    return Keypair.fromSecretKey(bytes);
  }
  if (bytes.length === 32) {
    return Keypair.fromSeed(bytes);
  }
  throw new Error(
    `PRIZE_WALLET_PRIVATE_KEY must decode to 32 or 64 bytes (got ${bytes.length})`,
  );
}

/** Supports base58 secret keys and JSON byte arrays from solana-keygen / wallet exports. */
export function keypairFromPrivateKeyEnv(raw: string): Keypair {
  const value = normalizeEnvValue(raw);

  if (value.startsWith("[")) {
    let bytes: number[];
    try {
      bytes = JSON.parse(value) as number[];
    } catch {
      throw new Error("PRIZE_WALLET_PRIVATE_KEY JSON byte array is invalid");
    }

    if (!Array.isArray(bytes)) {
      throw new Error("PRIZE_WALLET_PRIVATE_KEY JSON must be a byte array");
    }

    return keypairFromSecretBytes(Uint8Array.from(bytes));
  }

  try {
    return keypairFromSecretBytes(bs58.decode(value));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid private key";
    if (message.includes("Non-base58")) {
      throw new Error(
        "PRIZE_WALLET_PRIVATE_KEY must be base58 or a JSON byte array like [1,2,3,...]",
      );
    }
    throw err instanceof Error ? err : new Error(message);
  }
}

function resolvePrivateKey(): string | undefined {
  return trim(process.env.PRIZE_WALLET_PRIVATE_KEY) ?? trim(process.env.TREASURY_PRIVATE_KEY);
}

function resolveConfiguredWalletAddress(): string | undefined {
  return trim(process.env.PRIZE_WALLET) ?? trim(process.env.TREASURY_WALLET);
}

function resolveWalletAddress(privateKey: string): string {
  const configured = resolveConfiguredWalletAddress();
  const derived = keypairFromPrivateKeyEnv(privateKey).publicKey.toBase58();

  if (configured && configured !== derived) {
    throw new Error("PRIZE_WALLET does not match PRIZE_WALLET_PRIVATE_KEY");
  }

  return configured ?? derived;
}

/** Read-only prize wallet config (inventory / DAS). Prefers PRIZE_WALLET without decoding the private key. */
export function getPrizeWalletReadEnv(): PrizeWalletReadEnv | null {
  const rpcUrl = trim(process.env.SOLANA_RPC_URL);
  const configured = resolveConfiguredWalletAddress();

  if (rpcUrl && configured) {
    try {
      new PublicKey(configured);
      return { rpcUrl, walletAddress: configured };
    } catch {
      throw new Error("PRIZE_WALLET is not a valid Solana address");
    }
  }

  const env = getPrizeWalletEnv();
  return env ? { rpcUrl: env.rpcUrl, walletAddress: env.walletAddress } : null;
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

    return { rpcUrl, walletAddress, privateKey: normalizeEnvValue(privateKey) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid prize wallet configuration";
    throw new Error(message);
  }
}

export function isPrizeWalletConfigured(): boolean {
  try {
    return getPrizeWalletReadEnv() !== null;
  } catch {
    return false;
  }
}

export function isMockNftClaimEnabled(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
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
      "Prize wallet is not configured. Set SOLANA_RPC_URL and PRIZE_WALLET_PRIVATE_KEY.",
    );
  }

  return env;
}

export function requirePrizeWalletKeypair(): Keypair {
  const env = requirePrizeWalletEnv();
  if (env.privateKey === "mock") {
    return Keypair.generate();
  }
  return keypairFromPrivateKeyEnv(env.privateKey);
}
