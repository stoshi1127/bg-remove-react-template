import type { StripeMode } from '@prisma/client';

export function getStripeMode(): StripeMode {
  const explicit = process.env.STRIPE_MODE;
  if (explicit === 'test' || explicit === 'live') return explicit;

  const secretKey = process.env.STRIPE_SECRET_KEY ?? '';
  if (secretKey.startsWith('sk_live_')) return 'live';
  if (secretKey.startsWith('sk_test_')) return 'test';

  // Safe default for local dev; also forces users to set STRIPE_MODE/KEY correctly.
  return 'test';
}

