-- CreateEnum
CREATE TYPE "SpinOutcome" AS ENUM ('LOSS', 'NEAR_MISS', 'NFT_WIN');

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSpinAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spin" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "outcome" "SpinOutcome" NOT NULL,
    "symbols" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Spin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Spin_sessionId_createdAt_idx" ON "Spin"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "Spin" ADD CONSTRAINT "Spin_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
