import { NextResponse } from "next/server";
import { CLAIM_TX_PENDING, isClaimTxPending } from "@/lib/claim-pending";
import { ensureGameSession, requireAuthUserId } from "@/lib/game-session";
import { prisma } from "@/lib/prisma";
import { transferPrizeNft } from "@/lib/solana-nft-transfer";
import {
  isValidSolanaWalletAddress,
  normalizeSolanaWalletAddress,
} from "@/lib/solana-wallet";
import type { ClaimApiResponse } from "@/types/game";
import { prizeInfoFromSpin, prizeSentMessage } from "@/types/game";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Login required" }, { status: 401 });
}

function claimResponse(
  spinId: string,
  walletAddress: string,
  txSignature: string,
  prize: NonNullable<ReturnType<typeof prizeInfoFromSpin>>,
): ClaimApiResponse {
  return {
    spinId,
    walletAddress,
    txSignature,
    message: prizeSentMessage(prize),
    prize,
  };
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

  if (
    prizeSpin.collectedAt &&
    prizeSpin.claimTxSignature &&
    !isClaimTxPending(prizeSpin.claimTxSignature)
  ) {
    return NextResponse.json(
      claimResponse(
        prizeSpin.id,
        prizeSpin.claimWalletAddress ?? normalizedWallet,
        prizeSpin.claimTxSignature,
        prize,
      ),
    );
  }

  if (isClaimTxPending(prizeSpin.claimTxSignature)) {
    return NextResponse.json(
      { error: "Claim already in progress. Try again in a moment." },
      { status: 409 },
    );
  }

  const reserved = await prisma.spin.updateMany({
    where: {
      id: prizeSpin.id,
      gameSessionId: gameSession.id,
      outcome: "NFT_WIN",
      collectedAt: null,
      claimTxSignature: null,
    },
    data: {
      collectedAt: new Date(),
      claimWalletAddress: normalizedWallet,
      claimTxSignature: CLAIM_TX_PENDING,
    },
  });

  if (reserved.count !== 1) {
    const latest = await prisma.spin.findUnique({ where: { id: prizeSpin.id } });
    if (
      latest?.collectedAt &&
      latest.claimTxSignature &&
      !isClaimTxPending(latest.claimTxSignature)
    ) {
      const latestPrize = prizeInfoFromSpin(latest);
      if (latestPrize) {
        return NextResponse.json(
          claimResponse(
            latest.id,
            latest.claimWalletAddress ?? normalizedWallet,
            latest.claimTxSignature,
            latestPrize,
          ),
        );
      }
    }

    if (isClaimTxPending(latest?.claimTxSignature)) {
      return NextResponse.json(
        { error: "Claim already in progress. Try again in a moment." },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "No prize to claim" }, { status: 400 });
  }

  let txSignature: string;
  try {
    txSignature = await transferPrizeNft(normalizedWallet, prize.mintAddress);
  } catch (err) {
    await prisma.spin.updateMany({
      where: {
        id: prizeSpin.id,
        claimTxSignature: CLAIM_TX_PENDING,
      },
      data: {
        collectedAt: null,
        claimWalletAddress: null,
        claimTxSignature: null,
      },
    });

    const message = err instanceof Error ? err.message : "NFT transfer failed";
    console.error("[claim]", message, err);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  await prisma.spin.update({
    where: { id: prizeSpin.id },
    data: { claimTxSignature: txSignature },
  });

  return NextResponse.json(
    claimResponse(prizeSpin.id, normalizedWallet, txSignature, prize),
  );
}
