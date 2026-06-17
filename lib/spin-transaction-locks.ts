import type { Prisma } from "@/app/generated/prisma/client";

/** Serializes global win-pool checks across concurrent spins. */
const SPIN_WIN_POOL_ADVISORY_LOCK_KEY = 8675309;

type SpinTx = Prisma.TransactionClient;

export async function lockSpinWinPool(tx: SpinTx): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SPIN_WIN_POOL_ADVISORY_LOCK_KEY})`;
}

export async function lockGameSessionForSpin(tx: SpinTx, sessionId: string): Promise<void> {
  await tx.$executeRaw`SELECT 1 FROM "GameSession" WHERE "id" = ${sessionId} FOR UPDATE`;
}
