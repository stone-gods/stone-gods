import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-error";
import {
  cooldownUntilFromLastSpin,
  getDailySpinLimit,
} from "@/lib/spin-allowance";
import {
  assertSpinAllowanceInTx,
  getSpinAllowanceForSession,
} from "@/lib/spin-allowance-server";
import { isDevForceWin, isDevUnlimitedSpins } from "@/lib/dev";
import { ensureGameSession, requireAuthUserId } from "@/lib/game-session";
import { assignPrizeForWin, prefetchPrizeInventory, prizeFieldsFromInfo } from "@/lib/prize-assignment";
import { enrichPrizeInfo } from "@/lib/prize-inventory";
import { getPrizeWalletEnv } from "@/lib/prize-wallet-env";
import { prisma } from "@/lib/prisma";
import { generateSpin, outcomeMessage, resolveSpin } from "@/lib/spin-engine";
import {
  lockGameSessionForSpin,
  lockSpinWinPool,
} from "@/lib/spin-transaction-locks";
import { canAwardNftWin, shouldForceWinInWindow } from "@/lib/win-pool";
import type { PrizeInfo, ReelGrid, SpinStatusResponse } from "@/types/game";
import { prizeInfoFromSpin } from "@/types/game";

export const runtime = "nodejs";

function parseReels(symbols: unknown): ReelGrid {
  return symbols as ReelGrid;
}

function unauthorized() {
  return NextResponse.json({ error: "Login required" }, { status: 401 });
}

function apiErrorResponse(err: ApiError) {
  return NextResponse.json({ error: err.message, ...err.body }, { status: err.status });
}

async function maybeEnrichPrize(prize: PrizeInfo | null): Promise<PrizeInfo | null> {
  if (!prize) return null;
  const env = getPrizeWalletEnv();
  if (!env) return prize;
  return enrichPrizeInfo(prize, env.rpcUrl);
}

export async function GET() {
  const userId = await requireAuthUserId();
  if (!userId) return unauthorized();

  void prefetchPrizeInventory().catch(() => {});

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

  const uncollectedPrize = uncollectedWinRow
    ? await maybeEnrichPrize(prizeInfoFromSpin(uncollectedWinRow))
    : null;

  const response: SpinStatusResponse = {
    canSpin: allowance.canSpin && !uncollectedWinRow,
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
          prize: await maybeEnrichPrize(prizeInfoFromSpin(lastSpin)),
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

  try {
    const prizeInventoryPromise = prefetchPrizeInventory();

    const { spin, outcome, reels, prize } = await prisma.$transaction(
      async (tx) => {
      await lockSpinWinPool(tx);
      await lockGameSessionForSpin(tx, gameSession.id);

      const lockedSession = await tx.gameSession.findUniqueOrThrow({
        where: { id: gameSession.id },
      });

      const uncollectedWin = await tx.spin.findFirst({
        where: {
          gameSessionId: gameSession.id,
          outcome: "NFT_WIN",
          collectedAt: null,
        },
        select: { id: true },
      });

      if (uncollectedWin) {
        throw new ApiError(409, "Claim your prize before spinning again");
      }

      if (!unlimited) {
        const allowance = await assertSpinAllowanceInTx(tx, lockedSession, now);
        if (!allowance.canSpin) {
          throw new ApiError(429, "No spins remaining", {
            nextSpinAt: allowance.nextSpinAt?.toISOString() ?? null,
          });
        }
      }

      const [completedSpinCount, nftWinCount] = await Promise.all([
        tx.spin.count(),
        tx.spin.count({ where: { outcome: "NFT_WIN" } }),
      ]);

      const poolAllowsWin = canAwardNftWin(completedSpinCount, nftWinCount);
      const forceWin = shouldForceWinInWindow(completedSpinCount, nftWinCount);

      let result = isDevForceWin()
        ? generateSpin("NFT_WIN")
        : resolveSpin({
            canAwardWin: poolAllowsWin,
            forceWin,
          });

      let prize: PrizeInfo | null = null;

      if (result.outcome === "NFT_WIN") {
        const inventory = await prizeInventoryPromise;
        prize = await assignPrizeForWin(tx, inventory);
        if (!prize) {
          if (forceWin) {
            throw new ApiError(
              503,
              "Prize pool unavailable — spin not counted. Try again shortly.",
            );
          }
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
          data: { lastSpinAt: new Date() },
        });
      }

      return { spin: created, outcome: result.outcome, reels: result.reels, prize };
    },
      { maxWait: 15_000, timeout: 45_000 },
    );

    const displayPrize = prize ? await maybeEnrichPrize(prize) : null;
    const afterSpinAt = new Date();

    if (unlimited) {
      return NextResponse.json({
        spinId: spin.id,
        outcome,
        reels,
        prize: displayPrize,
        canSpinAgainAt: null,
        spinsRemaining: dailyLimit,
        message: outcomeMessage(outcome, unlimited, displayPrize),
      });
    }

    const updatedAllowance = await getSpinAllowanceForSession(session, afterSpinAt);
    const canSpinAgain = updatedAllowance.canSpin;

    return NextResponse.json({
      spinId: spin.id,
      outcome,
      reels,
      prize: displayPrize,
      canSpinAgainAt: canSpinAgain
        ? null
        : cooldownUntilFromLastSpin(spin.createdAt).toISOString(),
      spinsRemaining: updatedAllowance.spinsRemaining,
      message: outcomeMessage(outcome, unlimited, displayPrize),
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return apiErrorResponse(err);
    }
    throw err;
  }
}
