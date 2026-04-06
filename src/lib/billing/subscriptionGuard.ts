import type Stripe from 'stripe';

const BLOCKING_SUBSCRIPTION_STATUSES = new Set<Stripe.Subscription.Status>([
  'active',
  'trialing',
  'past_due',
  'unpaid',
  'paused',
]);

export function hasBlockingSubscriptionStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return BLOCKING_SUBSCRIPTION_STATUSES.has(status as Stripe.Subscription.Status);
}

export async function hasBlockingStripeSubscription(args: {
  stripe: Stripe;
  customerId: string;
}): Promise<boolean> {
  const subscriptions = await args.stripe.subscriptions.list({
    customer: args.customerId,
    status: 'all',
    limit: 10,
  });

  return subscriptions.data.some((subscription) =>
    hasBlockingSubscriptionStatus(subscription.status)
  );
}

export async function hasBlockingStripeSubscriptionByEmail(args: {
  stripe: Stripe;
  email: string;
}): Promise<boolean> {
  const customers = await args.stripe.customers.list({
    email: args.email,
    limit: 10,
  });

  for (const customer of customers.data) {
    if (!customer.id) continue;
    const hasBlocking = await hasBlockingStripeSubscription({
      stripe: args.stripe,
      customerId: customer.id,
    });
    if (hasBlocking) return true;
  }

  return false;
}
