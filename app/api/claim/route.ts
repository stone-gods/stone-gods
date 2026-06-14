import { NextResponse } from "next/server";
import { ensureGameSession, requireAuthUserId } from "@/lib/game-session";
import { prisma } from "@/lib/prisma";
import { transferStoneGodNft } from "@/lib/solana-nft-transfer";
import {
  isValidSolanaWalletAddress,
  normalizeSolanaWalletAddress,
} from "@/lib/solana-wallet";
import type { ClaimApiResponse } from "@/types/game";

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

  const prize = await prisma.spin.findFirst({
    where: {
      ...(body.spinId ? { id: body.spinId } : {}),
      gameSessionId: gameSession.id,
      outcome: "NFT_WIN",
      collectedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!prize) {
    return NextResponse.json({ error: "No prize to claim" }, { status: 400 });
  }

  let txSignature: string;
  try {
    txSignature = await transferStoneGodNft(normalizedWallet);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "NFT transfer failed";
    console.error("[claim]", message, err);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const now = new Date();

  await prisma.spin.update({
    where: { id: prize.id },
    data: {
      collectedAt: now,
      claimWalletAddress: normalizedWallet,
      claimTxSignature: txSignature,
    },
  });

  const response: ClaimApiResponse = {
    spinId: prize.id,
    walletAddress: normalizedWallet,
    txSignature,
    message: "Stone God NFT sent to your wallet!",
  };

  return NextResponse.json(response);
}
