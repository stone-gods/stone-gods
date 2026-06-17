import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import { dasRpc } from "@/lib/das-rpc";

export type PrizeTokenHolding = {
  mintAddress: string;
  tokenAccount: PublicKey;
  tokenProgram: PublicKey;
  interface?: string;
};

type HeliusAsset = {
  id: string;
  interface?: string;
  ownership?: { owner?: string };
  token_info?: {
    token_program?: string;
    associated_token_address?: string;
  };
};

function parseTokenProgram(value: string | undefined): PublicKey {
  if (!value) return TOKEN_PROGRAM_ID;
  return new PublicKey(value);
}

export async function resolvePrizeTokenHolding(
  mintAddress: string,
  ownerAddress: string,
  rpcUrl: string,
): Promise<PrizeTokenHolding> {
  const asset = await dasRpc<HeliusAsset>(rpcUrl, "getAsset", { id: mintAddress });
  const owner = asset.ownership?.owner;

  if (owner !== ownerAddress) {
    throw new Error(
      owner
        ? "This prize is no longer in the prize wallet"
        : "Could not verify prize NFT ownership",
    );
  }

  const mint = new PublicKey(mintAddress);
  const ownerPk = new PublicKey(ownerAddress);
  const tokenProgram = parseTokenProgram(asset.token_info?.token_program);

  const tokenAccount = asset.token_info?.associated_token_address
    ? new PublicKey(asset.token_info.associated_token_address)
    : getAssociatedTokenAddressSync(mint, ownerPk, false, tokenProgram);

  return {
    mintAddress,
    tokenAccount,
    tokenProgram,
    interface: asset.interface,
  };
}

/** Confirm the prize wallet still holds this NFT on-chain before transfer. */
export async function assertPrizeTokenAccountExists(
  connection: Connection,
  holding: PrizeTokenHolding,
): Promise<void> {
  const info = await connection.getAccountInfo(holding.tokenAccount);
  if (!info) {
    const programLabel =
      holding.tokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? "Token-2022" : "legacy SPL";
    throw new Error(
      `Prize token account not found (${programLabel}). The NFT may have been moved from the prize wallet.`,
    );
  }
}

export function recipientTokenAddress(
  mint: PublicKey,
  recipient: PublicKey,
  tokenProgram: PublicKey,
): PublicKey {
  return getAssociatedTokenAddressSync(mint, recipient, false, tokenProgram);
}
