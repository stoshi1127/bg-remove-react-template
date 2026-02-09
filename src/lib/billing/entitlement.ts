import type { StripeSubscription, StripeMode, UserPlan } from '@prisma/client';

export type BillingEntitlement = {
  plan: UserPlan;
  isPro: boolean;
  proValidUntil: Date | null;
  subscriptionStatus: string | null;
  stripeMode: StripeMode;
};

export function computeEntitlementFromSubscription(args: {
  subscription: StripeSubscription | null;
  now?: Date;
  stripeMode: StripeMode;
}): BillingEntitlement {
  const now = args.now ?? new Date();
  const sub = args.subscription;

  if (!sub) {
    return {
      plan: 'free',
      isPro: false,
      proValidUntil: null,
      subscriptionStatus: null,
      stripeMode: args.stripeMode,
    };
  }

  const status = sub.status;
  const currentPeriodEnd = sub.currentPeriodEnd ?? null;
  const endedAt = sub.endedAt ?? null;

  // If Stripe marked it ended already, stop immediately.
  if (endedAt && endedAt.getTime() <= now.getTime()) {
    return {
      plan: 'free',
      isPro: false,
      proValidUntil: null,
      subscriptionStatus: status,
      stripeMode: args.stripeMode,
    };
  }

  if (status === 'active' || status === 'trialing') {
    return {
      plan: 'pro',
      isPro: true,
      proValidUntil: null,
      subscriptionStatus: status,
      stripeMode: args.stripeMode,
    };
  }

  // User-selected policy: past_due/unpaid keeps Pro until period end.
  if (status === 'past_due' || status === 'unpaid') {
    const stillInPeriod = currentPeriodEnd ? currentPeriodEnd.getTime() > now.getTime() : false;
    return {
      plan: stillInPeriod ? 'pro' : 'free',
      isPro: stillInPeriod,
      proValidUntil: currentPeriodEnd,
      subscriptionStatus: status,
      stripeMode: args.stripeMode,
    };
  }

  // Conservative fallback: free.
  return {
    plan: 'free',
    isPro: false,
    proValidUntil: null,
    subscriptionStatus: status,
    stripeMode: args.stripeMode,
  };
}

