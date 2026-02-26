-- CreateTable
CREATE TABLE "PremiumUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PremiumUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PremiumUsage_userId_idx" ON "PremiumUsage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PremiumUsage_userId_yearMonth_key" ON "PremiumUsage"("userId", "yearMonth");

-- AddForeignKey
ALTER TABLE "PremiumUsage" ADD CONSTRAINT "PremiumUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
