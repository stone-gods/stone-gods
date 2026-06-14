const MS_PER_HOUR = 60 * 60 * 1000;

export function getDailySpinLimit(): number {
  const raw = process.env.DAILY_SPIN_LIMIT?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function getSpinCooldownMs(): number {
  const raw = process.env.SPIN_COOLDOWN_HOURS?.trim();
  const hours = raw ? Number.parseFloat(raw) : 24;
  return Number.isFinite(hours) && hours > 0 ? hours * MS_PER_HOUR : 24 * MS_PER_HOUR;
}

export type SpinAllowance = {
  canSpin: boolean;
  spinsRemaining: number;
  nextSpinAt: Date | null;
  periodStart: Date;
  shouldResetPeriod: boolean;
};

export function resolveSpinAllowance(input: {
  periodStart: Date;
  spinsInPeriod: number;
  lastSpinInPeriodAt: Date | null;
  limit: number;
  now?: Date;
  cooldownMs?: number;
}): SpinAllowance {
  const now = input.now ?? new Date();
  const cooldownMs = input.cooldownMs ?? getSpinCooldownMs();
  const { periodStart, spinsInPeriod, lastSpinInPeriodAt, limit } = input;

  if (spinsInPeriod < limit) {
    return {
      canSpin: true,
      spinsRemaining: limit - spinsInPeriod,
      nextSpinAt: null,
      periodStart,
      shouldResetPeriod: false,
    };
  }

  if (!lastSpinInPeriodAt) {
    return {
      canSpin: true,
      spinsRemaining: limit,
      nextSpinAt: null,
      periodStart: now,
      shouldResetPeriod: true,
    };
  }

  const cooldownUntil = new Date(lastSpinInPeriodAt.getTime() + cooldownMs);

  if (now >= cooldownUntil) {
    return {
      canSpin: true,
      spinsRemaining: limit,
      nextSpinAt: null,
      periodStart: now,
      shouldResetPeriod: true,
    };
  }

  return {
    canSpin: false,
    spinsRemaining: 0,
    nextSpinAt: cooldownUntil,
    periodStart,
    shouldResetPeriod: false,
  };
}

export function cooldownUntilFromLastSpin(
  lastSpinAt: Date,
  cooldownMs = getSpinCooldownMs(),
): Date {
  return new Date(lastSpinAt.getTime() + cooldownMs);
}
