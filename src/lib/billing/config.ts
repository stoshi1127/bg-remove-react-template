import { getStripeMode } from '@/lib/billing/stripeMode';

export function isBillingEnabled(): boolean {
  const v = process.env.BILLING_ENABLED;
  if (v === undefined) return true;
  return v === '1' || v.toLowerCase() === 'true' || v.toLowerCase() === 'yes';
}

export function getProPriceId(): string {
  const mode = getStripeMode();
  const priceId =
    mode === 'live' ? process.env.STRIPE_PRICE_ID_PRO_LIVE : process.env.STRIPE_PRICE_ID_PRO_TEST;
  if (!priceId) {
    throw new Error(`Stripe price ID for Pro is not set for mode=${mode}`);
  }
  return priceId;
}

