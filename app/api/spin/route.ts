import { NextResponse } from "next/server";
import { canSpinToday, nextSpinAt, startOfNextUtcDay } from "@/lib/daily-spin";
import { isDevUnlimitedSpins } from "@/lib/dev";
import { ensureGameSession, requireAuthUserId } from "@/lib/game-session";
import { prisma } from "@/lib/prisma";
import { outcomeMessage, resolveSpin } from "@/lib/spin-engine";
import type { ReelGrid, SpinStatusResponse } from "@/types/game";

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

  const session = await prisma.gameSession.findUnique({
    where: { id: gameSession.id },
    include: {
      spins: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const lastSpin = session?.spins[0] ?? null;
  const canSpin = unlimited || canSpinToday(session?.lastSpinAt, now);

  const uncollectedWin = await prisma.spin.findFirst({
    where: {
      gameSessionId: gameSession.id,
      outcome: "NFT_WIN",
      collectedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const response: SpinStatusResponse = {
    canSpin,
    nextSpinAt: unlimited
      ? null
      : (nextSpinAt(session?.lastSpinAt, now)?.toISOString() ?? null),
    uncollectedWin: uncollectedWin ? { spinId: uncollectedWin.id } : null,
    lastSpin: lastSpin
      ? {
          spinId: lastSpin.id,
          outcome: lastSpin.outcome,
          reels: parseReels(lastSpin.symbols),
          createdAt: lastSpin.createdAt.toISOString(),
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

  const session = await prisma.gameSession.findUnique({
    where: { id: gameSession.id },
  });

  if (!session) {
    return NextResponse.json({ error: "Game session not found" }, { status: 500 });
  }

  if (!unlimited && !canSpinToday(session.lastSpinAt, now)) {
    return NextResponse.json(
      {
        error: "Daily spin already used",
        nextSpinAt: nextSpinAt(session.lastSpinAt, now)?.toISOString() ?? null,
      },
      { status: 429 },
    );
  }

  const { outcome, reels } = resolveSpin();

  const spin = await prisma.$transaction(async (tx) => {
    const created = await tx.spin.create({
      data: {
        gameSessionId: gameSession.id,
        outcome,
        symbols: reels,
      },
    });

    if (!unlimited) {
      await tx.gameSession.update({
        where: { id: gameSession.id },
        data: { lastSpinAt: now },
      });
    }

    return created;
  });

  return NextResponse.json({
    spinId: spin.id,
    outcome,
    reels,
    canSpinAgainAt: unlimited ? null : startOfNextUtcDay(now).toISOString(),
    message: outcomeMessage(outcome, unlimited),
  });
}
