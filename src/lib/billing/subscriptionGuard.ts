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
  const summary = await getBlockingStripeSubscriptionSummaryByEmail(args);
  return summary.hasBlocking;
}

export async function getBlockingStripeSubscriptionSummaryByEmail(args: {
  stripe: Stripe;
  email: string;
}): Promise<{
  hasBlocking: boolean;
  customerCount: number;
  blockingCustomerCount: number;
  blockingStatuses: string[];
}> {
  const customers = await args.stripe.customers.list({
    email: args.email,
    limit: 10,
  });

  const blockingStatuses = new Set<string>();
  let blockingCustomerCount = 0;

  for (const customer of customers.data) {
    if (!customer.id) continue;
    const subscriptions = await args.stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 10,
    });
    const customerBlockingStatuses = subscriptions.data
      .map((subscription) => subscription.status)
      .filter((status) => hasBlockingSubscriptionStatus(status));
    if (customerBlockingStatuses.length > 0) {
      blockingCustomerCount += 1;
      customerBlockingStatuses.forEach((status) => blockingStatuses.add(status));
    }
  }

  return {
    hasBlocking: blockingCustomerCount > 0,
    customerCount: customers.data.length,
    blockingCustomerCount,
    blockingStatuses: Array.from(blockingStatuses).sort(),
  };
}
