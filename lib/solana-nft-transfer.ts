import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import { isMockNftClaimEnabled, requirePrizeWalletEnv, requirePrizeWalletKeypair } from "@/lib/prize-wallet-env";
import {
  assertSplTokenAccountExists,
  recipientTokenAddress,
  resolvePrizeAssetForTransfer,
  type ResolvedPrizeAsset,
} from "@/lib/prize-token-holding";
import { transferCoreAsset } from "@/lib/solana-core-transfer";

function userFacingTransferError(err: unknown): string {
  if (!(err instanceof Error)) return "NFT transfer failed";

  const message = err.message;
  if (message.includes("TokenAccountNotFoundError")) {
    return "Prize token account not found. The NFT may no longer be in the prize wallet.";
  }

  return message;
}

async function transferSplPrize(
  connection: Connection,
  prizeWallet: Keypair,
  recipient: PublicKey,
  asset: Extract<ResolvedPrizeAsset, { kind: "spl" }>,
): Promise<string> {
  const mint = new PublicKey(asset.mintAddress);

  await assertSplTokenAccountExists(connection, asset.tokenAccount, asset.tokenProgram);

  const destAta = recipientTokenAddress(mint, recipient, asset.tokenProgram);
  const programId = asset.tokenProgram;
  const tx = new Transaction();

  try {
    await getAccount(connection, destAta, undefined, programId);
  } catch {
    tx.add(
      createAssociatedTokenAccountInstruction(
        prizeWallet.publicKey,
        destAta,
        recipient,
        mint,
        programId,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      ),
    );
  }

  tx.add(
    createTransferInstruction(
      asset.tokenAccount,
      destAta,
      prizeWallet.publicKey,
      1,
      [],
      programId,
    ),
  );

  return sendAndConfirmTransaction(connection, tx, [prizeWallet], {
    commitment: "confirmed",
  });
}

export async function transferPrizeNft(
  recipientAddress: string,
  mintAddress: string,
): Promise<string> {
  if (isMockNftClaimEnabled()) {
    return `mock-${mintAddress}-${Date.now()}`;
  }

  if (mintAddress.startsWith("mock-")) {
    throw new Error("This win used a test prize. Spin again after disabling DEV_FORCE_WIN.");
  }

  const env = requirePrizeWalletEnv();
  const connection = new Connection(env.rpcUrl, "confirmed");
  const prizeWallet = requirePrizeWalletKeypair();
  const recipient = new PublicKey(recipientAddress);

  try {
    const asset = await resolvePrizeAssetForTransfer(
      mintAddress,
      env.walletAddress,
      env.rpcUrl,
    );

    if (asset.kind === "core") {
      return await transferCoreAsset(
        env.rpcUrl,
        prizeWallet,
        asset.assetAddress,
        recipientAddress,
        asset.collectionAddress,
      );
    }

    return await transferSplPrize(connection, prizeWallet, recipient, asset);
  } catch (err) {
    throw new Error(userFacingTransferError(err));
  }
}
