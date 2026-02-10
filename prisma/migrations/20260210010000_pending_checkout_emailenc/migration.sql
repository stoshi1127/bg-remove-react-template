-- This table is explicitly ephemeral (short-lived purchase flow state).
-- We rebuild it to adjust columns without complex backfills.

-- Drop the old table (no long-term business data).
DROP TABLE IF EXISTS "PendingCheckout";

CREATE TABLE "PendingCheckout" (
  "id" TEXT NOT NULL,
  "emailEnc" TEXT NOT NULL,
  "emailHash" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "stripeCheckoutSessionId" TEXT,
  "stripeMode" "StripeMode" NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PendingCheckout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PendingCheckout_tokenHash_key" ON "PendingCheckout"("tokenHash");
CREATE UNIQUE INDEX "PendingCheckout_stripeCheckoutSessionId_key" ON "PendingCheckout"("stripeCheckoutSessionId");
CREATE INDEX "PendingCheckout_emailHash_stripeMode_createdAt_idx" ON "PendingCheckout"("emailHash", "stripeMode", "createdAt");
CREATE INDEX "PendingCheckout_stripeMode_createdAt_idx" ON "PendingCheckout"("stripeMode", "createdAt");

