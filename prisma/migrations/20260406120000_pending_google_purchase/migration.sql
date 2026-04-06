CREATE TABLE "PendingGooglePurchase" (
  "id" TEXT NOT NULL,
  "stateHash" TEXT NOT NULL,
  "googleSub" TEXT,
  "emailEnc" TEXT,
  "emailHash" TEXT,
  "name" TEXT,
  "image" TEXT,
  "stripeCheckoutSessionId" TEXT,
  "stripeMode" "StripeMode" NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "authorizedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PendingGooglePurchase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PendingGooglePurchase_stateHash_key" ON "PendingGooglePurchase"("stateHash");
CREATE UNIQUE INDEX "PendingGooglePurchase_stripeCheckoutSessionId_key" ON "PendingGooglePurchase"("stripeCheckoutSessionId");
CREATE INDEX "PendingGooglePurchase_emailHash_stripeMode_createdAt_idx" ON "PendingGooglePurchase"("emailHash", "stripeMode", "createdAt");
CREATE INDEX "PendingGooglePurchase_stripeMode_createdAt_idx" ON "PendingGooglePurchase"("stripeMode", "createdAt");
CREATE INDEX "PendingGooglePurchase_googleSub_stripeMode_createdAt_idx" ON "PendingGooglePurchase"("googleSub", "stripeMode", "createdAt");
