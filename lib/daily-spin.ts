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

export function canSpinToday(
  lastSpinAt: Date | null | undefined,
  now = new Date(),
): boolean {
  if (!lastSpinAt) return true;
  return lastSpinAt < startOfUtcDay(now);
}

export function nextSpinAt(
  lastSpinAt: Date | null | undefined,
  now = new Date(),
): Date | null {
  if (canSpinToday(lastSpinAt, now)) return null;
  return startOfNextUtcDay(now);
}
