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
import { getTreasuryEnv, isMockNftClaimEnabled } from "@/lib/treasury-env";

export async function transferStoneGodNft(recipientAddress: string): Promise<string> {
  if (isMockNftClaimEnabled()) {
    return `mock-${Date.now()}`;
  }

  const env = getTreasuryEnv();
  if (!env) {
    throw new Error(
      "NFT treasury is not configured. Set SOLANA_RPC_URL, TREASURY_PRIVATE_KEY, and NFT_MINT_ADDRESS.",
    );
  }

  const connection = new Connection(env.rpcUrl, "confirmed");
  const treasury = Keypair.fromSecretKey(bs58.decode(env.privateKey));
  const mint = new PublicKey(env.nftMintAddress);
  const recipient = new PublicKey(recipientAddress);

  const treasuryAta = await getAssociatedTokenAddress(mint, treasury.publicKey);
  const recipientAta = await getAssociatedTokenAddress(mint, recipient);

  await getAccount(connection, treasuryAta);

  const tx = new Transaction();

  try {
    await getAccount(connection, recipientAta);
  } catch {
    tx.add(
      createAssociatedTokenAccountInstruction(
        treasury.publicKey,
        recipientAta,
        recipient,
        mint,
      ),
    );
  }

  tx.add(
    createTransferInstruction(treasuryAta, recipientAta, treasury.publicKey, 1),
  );

  return sendAndConfirmTransaction(connection, tx, [treasury], {
    commitment: "confirmed",
  });
}
