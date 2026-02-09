-- CreateTable
CREATE TABLE "PendingCheckout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "stripeCheckoutSessionId" TEXT,
    "stripeMode" "StripeMode" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingCheckout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingCheckout_tokenHash_key" ON "PendingCheckout"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "PendingCheckout_stripeCheckoutSessionId_key" ON "PendingCheckout"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "PendingCheckout_userId_createdAt_idx" ON "PendingCheckout"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PendingCheckout_stripeMode_createdAt_idx" ON "PendingCheckout"("stripeMode", "createdAt");

-- AddForeignKey
ALTER TABLE "PendingCheckout" ADD CONSTRAINT "PendingCheckout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

