export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function startOfNextUtcDay(date: Date): Date {
  const start = startOfUtcDay(date);
  start.setUTCDate(start.getUTCDate() + 1);
  return start;
}

export function getDailySpinLimit(): number {
  const raw = process.env.DAILY_SPIN_LIMIT?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function canSpinMore(usedToday: number, limit: number): boolean {
  return usedToday < limit;
}

export function spinsRemaining(usedToday: number, limit: number): number {
  return Math.max(0, limit - usedToday);
}

export function nextSpinAtWhenLimited(
  usedToday: number,
  limit: number,
  now = new Date(),
): Date | null {
  if (canSpinMore(usedToday, limit)) return null;
  return startOfNextUtcDay(now);
}

/** @deprecated use canSpinMore with spin count */
export function canSpinToday(
  lastSpinAt: Date | null | undefined,
  now = new Date(),
): boolean {
  if (!lastSpinAt) return true;
  return lastSpinAt < startOfUtcDay(now);
}

/** @deprecated use nextSpinAtWhenLimited with spin count */
export function nextSpinAt(
  lastSpinAt: Date | null | undefined,
  now = new Date(),
): Date | null {
  if (canSpinToday(lastSpinAt, now)) return null;
  return startOfNextUtcDay(now);
}
