import Stripe from 'stripe';

let cachedStripe: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (cachedStripe) return cachedStripe;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }

  cachedStripe = new Stripe(secretKey, {
    // Keep this pinned for stability.
    apiVersion: '2025-01-27.acacia',
    // Optional: allow TS to narrow.
    typescript: true,
  });

  return cachedStripe;
}

