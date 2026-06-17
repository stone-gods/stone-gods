import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getDailySpinLimit,
  getSpinCooldownMs,
  resolveSpinAllowance,
  type SpinAllowance,
} from "@/lib/spin-allowance";

type SpinTx = Prisma.TransactionClient;

type GameSessionRow = {
  id: string;
  createdAt: Date;
  spinPeriodStartAt: Date | null;
};

async function countSpinsInPeriod(
  tx: SpinTx,
  sessionId: string,
  periodStart: Date,
): Promise<number> {
  return tx.spin.count({
    where: {
      gameSessionId: sessionId,
      createdAt: { gte: periodStart },
    },
  });
}

async function lastSpinInPeriodAt(
  tx: SpinTx,
  sessionId: string,
  periodStart: Date,
): Promise<Date | null> {
  const row = await tx.spin.findFirst({
    where: {
      gameSessionId: sessionId,
      createdAt: { gte: periodStart },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  return row?.createdAt ?? null;
}

function resolveAllowanceForSession(
  session: GameSessionRow,
  spinsInPeriod: number,
  lastSpinAt: Date | null,
  now: Date,
): SpinAllowance & { spinsInPeriod: number } {
  const limit = getDailySpinLimit();
  const cooldownMs = getSpinCooldownMs();
  const periodStart = session.spinPeriodStartAt ?? session.createdAt;

  const allowance = resolveSpinAllowance({
    periodStart,
    spinsInPeriod,
    lastSpinInPeriodAt: lastSpinAt,
    limit,
    now,
    cooldownMs,
  });

  return { ...allowance, spinsInPeriod };
}

/**
 * Authoritative spin allowance check — call inside a transaction after locking the session row.
 * Applies period reset when the cooldown has elapsed.
 */
export async function assertSpinAllowanceInTx(
  tx: SpinTx,
  session: GameSessionRow,
  now: Date,
): Promise<SpinAllowance & { spinsInPeriod: number }> {
  let periodStart = session.spinPeriodStartAt ?? session.createdAt;
  let spinsInPeriod = await countSpinsInPeriod(tx, session.id, periodStart);
  let lastSpinAt = await lastSpinInPeriodAt(tx, session.id, periodStart);

  let allowance = resolveAllowanceForSession(session, spinsInPeriod, lastSpinAt, now);

  if (allowance.shouldResetPeriod) {
    periodStart = now;
    await tx.gameSession.update({
      where: { id: session.id },
      data: { spinPeriodStartAt: now },
    });

    spinsInPeriod = 0;
    lastSpinAt = null;
    allowance = resolveAllowanceForSession(
      { ...session, spinPeriodStartAt: now },
      spinsInPeriod,
      lastSpinAt,
      now,
    );
  }

  return allowance;
}

export async function getSpinAllowanceForSession(
  session: GameSessionRow,
  now = new Date(),
): Promise<SpinAllowance & { spinsInPeriod: number }> {
  const limit = getDailySpinLimit();
  const cooldownMs = getSpinCooldownMs();
  let periodStart = session.spinPeriodStartAt ?? session.createdAt;

  let spinsInPeriod = await prisma.spin.count({
    where: {
      gameSessionId: session.id,
      createdAt: { gte: periodStart },
    },
  });

  let lastSpinInPeriod = await prisma.spin.findFirst({
    where: {
      gameSessionId: session.id,
      createdAt: { gte: periodStart },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  let allowance = resolveSpinAllowance({
    periodStart,
    spinsInPeriod,
    lastSpinInPeriodAt: lastSpinInPeriod?.createdAt ?? null,
    limit,
    now,
    cooldownMs,
  });

  if (allowance.shouldResetPeriod) {
    periodStart = now;
    await prisma.gameSession.update({
      where: { id: session.id },
      data: { spinPeriodStartAt: now },
    });

    spinsInPeriod = 0;
    lastSpinInPeriod = null;
    allowance = resolveSpinAllowance({
      periodStart,
      spinsInPeriod,
      lastSpinInPeriodAt: null,
      limit,
      now,
      cooldownMs,
    });
  }

  return { ...allowance, spinsInPeriod };
}
