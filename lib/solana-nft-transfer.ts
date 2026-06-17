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
import { getPrizeWalletEnv, isMockNftClaimEnabled } from "@/lib/prize-wallet-env";

export async function transferStoneGodNft(recipientAddress: string): Promise<string> {
  if (isMockNftClaimEnabled()) {
    return `mock-${Date.now()}`;
  }

  const env = getPrizeWalletEnv();
  if (!env) {
    throw new Error(
      "Prize wallet is not configured. Set SOLANA_RPC_URL, PRIZE_WALLET, PRIZE_WALLET_PRIVATE_KEY, and NFT_MINT_ADDRESS.",
    );
  }

  const connection = new Connection(env.rpcUrl, "confirmed");
  const prizeWallet = Keypair.fromSecretKey(bs58.decode(env.privateKey));
  const mint = new PublicKey(env.nftMintAddress);
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
