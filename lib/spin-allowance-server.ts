import { prisma } from "@/lib/prisma";
import {
  getDailySpinLimit,
  getSpinCooldownMs,
  resolveSpinAllowance,
  type SpinAllowance,
} from "@/lib/spin-allowance";

type GameSessionRow = {
  id: string;
  createdAt: Date;
  spinPeriodStartAt: Date | null;
};

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
