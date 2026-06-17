import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddress,
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

export async function transferPrizeNft(
  recipientAddress: string,
  mintAddress: string,
): Promise<string> {
  if (isMockNftClaimEnabled()) {
    return `mock-${mintAddress}-${Date.now()}`;
  }

  const env = requirePrizeWalletEnv();
  const connection = new Connection(env.rpcUrl, "confirmed");
  const prizeWallet = Keypair.fromSecretKey(bs58.decode(env.privateKey));
  const mint = new PublicKey(mintAddress);
  const recipient = new PublicKey(recipientAddress);

  const prizeAta = await getAssociatedTokenAddress(mint, prizeWallet.publicKey);
  const recipientAta = await getAssociatedTokenAddress(mint, recipient);

  await getAccount(connection, prizeAta);

  const tx = new Transaction();

  try {
    await getAccount(connection, recipientAta);
  } catch {
    tx.add(
      createAssociatedTokenAccountInstruction(
        prizeWallet.publicKey,
        recipientAta,
        recipient,
        mint,
      ),
    );
  }

  tx.add(
    createTransferInstruction(prizeAta, recipientAta, prizeWallet.publicKey, 1),
  );

  return sendAndConfirmTransaction(connection, tx, [prizeWallet], {
    commitment: "confirmed",
  });
}
