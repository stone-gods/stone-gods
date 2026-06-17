import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import { dasRpc } from "@/lib/das-rpc";

export type PrizeAssetKind = "core" | "spl";

export type ResolvedPrizeAsset =
  | {
      kind: "core";
      assetAddress: string;
      collectionAddress: string | null;
    }
  | {
      kind: "spl";
      mintAddress: string;
      tokenAccount: PublicKey;
      tokenProgram: PublicKey;
    };

type HeliusAsset = {
  id: string;
  interface?: string;
  ownership?: { owner?: string };
  grouping?: { group_key: string; group_value: string }[];
  token_info?: {
    token_program?: string;
    associated_token_address?: string;
  };
};

function parseTokenProgram(value: string | undefined): PublicKey {
  if (!value) return TOKEN_PROGRAM_ID;
  return new PublicKey(value);
}

function collectionAddressFromAsset(asset: HeliusAsset): string | null {
  return (
    asset.grouping?.find((group) => group.group_key === "collection")?.group_value ??
    null
  );
}

export async function resolvePrizeAssetForTransfer(
  assetOrMintId: string,
  ownerAddress: string,
  rpcUrl: string,
): Promise<ResolvedPrizeAsset> {
  const asset = await dasRpc<HeliusAsset>(rpcUrl, "getAsset", { id: assetOrMintId });
  const owner = asset.ownership?.owner;

  if (owner !== ownerAddress) {
    throw new Error(
      owner
        ? "This prize is no longer in the prize wallet"
        : "Could not verify prize NFT ownership",
    );
  }

  if (asset.interface === "MplCoreAsset") {
    return {
      kind: "core",
      assetAddress: asset.id,
      collectionAddress: collectionAddressFromAsset(asset),
    };
  }

  const mintAddress = asset.id;
  const mint = new PublicKey(mintAddress);
  const ownerPk = new PublicKey(ownerAddress);
  const tokenProgram = parseTokenProgram(asset.token_info?.token_program);

  const tokenAccount = asset.token_info?.associated_token_address
    ? new PublicKey(asset.token_info.associated_token_address)
    : getAssociatedTokenAddressSync(mint, ownerPk, false, tokenProgram);

  return {
    kind: "spl",
    mintAddress,
    tokenAccount,
    tokenProgram,
  };
}

/** Confirm the prize wallet still holds this SPL NFT on-chain before transfer. */
export async function assertSplTokenAccountExists(
  connection: Connection,
  tokenAccount: PublicKey,
  tokenProgram: PublicKey,
): Promise<void> {
  const info = await connection.getAccountInfo(tokenAccount);
  if (!info) {
    const programLabel =
      tokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? "Token-2022" : "legacy SPL";
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
