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
import bs58 from "bs58";
import { isMockNftClaimEnabled, requirePrizeWalletEnv } from "@/lib/prize-wallet-env";
import {
  assertPrizeTokenAccountExists,
  recipientTokenAddress,
  resolvePrizeTokenHolding,
  type PrizeTokenHolding,
} from "@/lib/prize-token-holding";

function userFacingTransferError(err: unknown): string {
  if (!(err instanceof Error)) return "NFT transfer failed";

  const message = err.message;
  if (message.includes("TokenAccountNotFoundError")) {
    return "Prize token account not found. The NFT may no longer be in the prize wallet.";
  }

  return message;
}

async function transferResolvedNft(
  connection: Connection,
  prizeWallet: Keypair,
  recipient: PublicKey,
  mint: PublicKey,
  holding: PrizeTokenHolding,
): Promise<string> {
  await assertPrizeTokenAccountExists(connection, holding);

  const sourceAta = holding.tokenAccount;
  const destAta = recipientTokenAddress(mint, recipient, holding.tokenProgram);
  const programId = holding.tokenProgram;

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
    createTransferInstruction(sourceAta, destAta, prizeWallet.publicKey, 1, [], programId),
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
  const prizeWallet = Keypair.fromSecretKey(bs58.decode(env.privateKey));
  const mint = new PublicKey(mintAddress);
  const recipient = new PublicKey(recipientAddress);

  try {
    const holding = await resolvePrizeTokenHolding(
      mintAddress,
      env.walletAddress,
      env.rpcUrl,
    );

    return await transferResolvedNft(connection, prizeWallet, recipient, mint, holding);
  } catch (err) {
    throw new Error(userFacingTransferError(err));
  }
}
