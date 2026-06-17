import { NextResponse } from "next/server";
import { ensureGameSession, requireAuthUserId } from "@/lib/game-session";
import { prisma } from "@/lib/prisma";
import { transferPrizeNft } from "@/lib/solana-nft-transfer";
import {
  isValidSolanaWalletAddress,
  normalizeSolanaWalletAddress,
} from "@/lib/solana-wallet";
import type { ClaimApiResponse } from "@/types/game";
import { prizeInfoFromSpin } from "@/types/game";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Login required" }, { status: 401 });
}

export async function POST(request: Request) {
  const userId = await requireAuthUserId();
  if (!userId) return unauthorized();

  let body: { walletAddress?: string; spinId?: string };
  try {
    body = (await request.json()) as { walletAddress?: string; spinId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const walletAddress = body.walletAddress?.trim();
  if (!walletAddress || !isValidSolanaWalletAddress(walletAddress)) {
    return NextResponse.json(
      { error: "Enter a valid Solana wallet address" },
      { status: 400 },
    );
  }

  const normalizedWallet = normalizeSolanaWalletAddress(walletAddress);
  const gameSession = await ensureGameSession(userId);

  const prizeSpin = await prisma.spin.findFirst({
    where: {
      ...(body.spinId ? { id: body.spinId } : {}),
      gameSessionId: gameSession.id,
      outcome: "NFT_WIN",
      collectedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!prizeSpin) {
    return NextResponse.json({ error: "No prize to claim" }, { status: 400 });
  }

  const prize = prizeInfoFromSpin(prizeSpin);
  if (!prize) {
    return NextResponse.json({ error: "Prize details missing for this win" }, { status: 500 });
  }

  let txSignature: string;
  try {
    txSignature = await transferPrizeNft(normalizedWallet, prize.mintAddress);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "NFT transfer failed";
    console.error("[claim]", message, err);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const now = new Date();

  await prisma.spin.update({
    where: { id: prizeSpin.id },
    data: {
      collectedAt: now,
      claimWalletAddress: normalizedWallet,
      claimTxSignature: txSignature,
    },
  });

  const response: ClaimApiResponse = {
    spinId: prizeSpin.id,
    walletAddress: normalizedWallet,
    txSignature,
    message: prize.number
      ? `${prize.name} #${prize.number} sent to your wallet!`
      : `${prize.name} sent to your wallet!`,
    prize,
  };

  return NextResponse.json(response);
}
