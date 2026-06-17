import { NextResponse } from "next/server";
import {
  cooldownUntilFromLastSpin,
  getDailySpinLimit,
} from "@/lib/spin-allowance";
import { getSpinAllowanceForSession } from "@/lib/spin-allowance-server";
import { isDevForceWin, isDevUnlimitedSpins } from "@/lib/dev";
import { ensureGameSession, requireAuthUserId } from "@/lib/game-session";
import { assignPrizeForWin, prizeFieldsFromInfo } from "@/lib/prize-assignment";
import { prisma } from "@/lib/prisma";
import { generateSpin, outcomeMessage, resolveSpin } from "@/lib/spin-engine";
import { canAwardNftWin } from "@/lib/win-pool";
import type { PrizeInfo, ReelGrid, SpinStatusResponse } from "@/types/game";
import { prizeInfoFromSpin } from "@/types/game";

export const runtime = "nodejs";

function parseReels(symbols: unknown): ReelGrid {
  return symbols as ReelGrid;
}

function unauthorized() {
  return NextResponse.json({ error: "Login required" }, { status: 401 });
}

export async function GET() {
  const userId = await requireAuthUserId();
  if (!userId) return unauthorized();

  const gameSession = await ensureGameSession(userId);
  const now = new Date();
  const unlimited = isDevUnlimitedSpins();
  const dailyLimit = getDailySpinLimit();

  const session = await prisma.gameSession.findUnique({
    where: { id: gameSession.id },
    include: {
      spins: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Game session not found" }, { status: 500 });
  }

  const allowance = unlimited
    ? {
        canSpin: true,
        spinsRemaining: dailyLimit,
        nextSpinAt: null as Date | null,
        spinsInPeriod: 0,
      }
    : await getSpinAllowanceForSession(session, now);

  const lastSpin = session.spins[0] ?? null;

  const uncollectedWinRow = await prisma.spin.findFirst({
    where: {
      gameSessionId: gameSession.id,
      outcome: "NFT_WIN",
      collectedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  const uncollectedPrize = uncollectedWinRow ? prizeInfoFromSpin(uncollectedWinRow) : null;

  const response: SpinStatusResponse = {
    canSpin: allowance.canSpin,
    spinsRemaining: allowance.spinsRemaining,
    dailySpinLimit: dailyLimit,
    nextSpinAt: unlimited ? null : (allowance.nextSpinAt?.toISOString() ?? null),
    uncollectedWin:
      uncollectedWinRow && uncollectedPrize
        ? { spinId: uncollectedWinRow.id, prize: uncollectedPrize }
        : null,
    lastSpin: lastSpin
      ? {
          spinId: lastSpin.id,
          outcome: lastSpin.outcome,
          reels: parseReels(lastSpin.symbols),
          createdAt: lastSpin.createdAt.toISOString(),
          prize: prizeInfoFromSpin(lastSpin),
        }
      : null,
  };

  return NextResponse.json(response);
}

export async function POST() {
  const userId = await requireAuthUserId();
  if (!userId) return unauthorized();

  const gameSession = await ensureGameSession(userId);
  const now = new Date();
  const unlimited = isDevUnlimitedSpins();
  const dailyLimit = getDailySpinLimit();

  const session = await prisma.gameSession.findUnique({
    where: { id: gameSession.id },
  });

  if (!session) {
    return NextResponse.json({ error: "Game session not found" }, { status: 500 });
  }

  if (!unlimited) {
    const allowance = await getSpinAllowanceForSession(session, now);
    if (!allowance.canSpin) {
      return NextResponse.json(
        {
          error: "No spins remaining",
          nextSpinAt: allowance.nextSpinAt?.toISOString() ?? null,
        },
        { status: 429 },
      );
    }
  }

  const { spin, outcome, reels, prize } = await prisma.$transaction(async (tx) => {
    const [completedSpinCount, nftWinCount] = await Promise.all([
      tx.spin.count(),
      tx.spin.count({ where: { outcome: "NFT_WIN" } }),
    ]);

    let result = isDevForceWin()
      ? generateSpin("NFT_WIN")
      : resolveSpin({
          canAwardWin: canAwardNftWin(completedSpinCount, nftWinCount),
        });

    let prize: PrizeInfo | null = null;

    if (result.outcome === "NFT_WIN") {
      prize = await assignPrizeForWin(tx);
      if (!prize) {
        result = generateSpin("LOSS");
      }
    }

    const created = await tx.spin.create({
      data: {
        gameSessionId: gameSession.id,
        outcome: result.outcome,
        symbols: result.reels,
        ...(prize ? prizeFieldsFromInfo(prize) : {}),
      },
    });

    if (!unlimited) {
      await tx.gameSession.update({
        where: { id: gameSession.id },
        data: { lastSpinAt: now },
      });
    }

    return { spin: created, outcome: result.outcome, reels: result.reels, prize };
  });

  if (unlimited) {
    return NextResponse.json({
      spinId: spin.id,
      outcome,
      reels,
      prize,
      canSpinAgainAt: null,
      spinsRemaining: dailyLimit,
      message: outcomeMessage(outcome, unlimited, prize),
    });
  }

  const updatedAllowance = await getSpinAllowanceForSession(session, now);
  const canSpinAgain = updatedAllowance.canSpin;

  return NextResponse.json({
    spinId: spin.id,
    outcome,
    reels,
    prize,
    canSpinAgainAt: canSpinAgain
      ? null
      : cooldownUntilFromLastSpin(spin.createdAt).toISOString(),
    spinsRemaining: updatedAllowance.spinsRemaining,
    message: outcomeMessage(outcome, unlimited, prize),
  });
}
