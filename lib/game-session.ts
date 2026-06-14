import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getAuthUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function requireAuthUserId(): Promise<string | null> {
  return getAuthUserId();
}

export async function ensureGameSession(userId: string) {
  return prisma.gameSession.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}
