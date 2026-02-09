import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { prisma } from '@/lib/db';
import { getStripeClient } from '@/lib/billing/stripe';
import { getStripeMode } from '@/lib/billing/stripeMode';
import { computeEntitlementFromSubscription } from '@/lib/billing/entitlement';

export const runtime = 'nodejs';

function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  return secret;
}

function asStringId(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function dateFromStripeTs(ts: unknown): Date | null {
  return typeof ts === 'number' && Number.isFinite(ts) ? new Date(ts * 1000) : null;
}

function getPrismaErrorCode(e: unknown): string | null {
  if (!e || typeof e !== 'object') return null;
  const rec = e as Record<string, unknown>;
  return typeof rec.code === 'string' ? rec.code : null;
}

export async function POST(req: Request) {
  const stripe = getStripeClient();
  const stripeMode = getStripeMode();

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json({ ok: false, error: 'Missing stripe-signature' }, { status: 400 });
    }

    const rawBody = Buffer.from(await req.arrayBuffer());
    const event = stripe.webhooks.constructEvent(rawBody, signature, getWebhookSecret());

    // Idempotency + sync in one transaction.
    await prisma.$transaction(async (tx) => {
      // Deduplicate on (eventId, stripeMode).
      try {
        await tx.stripeWebhookEvent.create({
          data: { eventId: event.id, type: event.type, stripeMode },
        });
      } catch (e: unknown) {
        // P2002 = unique constraint violation
        if (getPrismaErrorCode(e) === 'P2002') {
          return;
        }
        throw e;
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = asStringId(session.metadata?.userId) ?? asStringId(session.client_reference_id);
        const customerId = asStringId(session.customer);

        if (!userId || !customerId) return;

        // Mode mixing protection: only upsert in current mode.
        await tx.stripeCustomer.upsert({
          where: { userId },
          create: {
            userId,
            stripeCustomerId: customerId,
            stripeMode,
          },
          update: {
            stripeCustomerId: customerId,
            stripeMode,
          },
        });

        // Best-effort: mark user as Pro immediately. Subscription details will be synced by subscription.updated.
        await tx.user.update({
          where: { id: userId },
          data: { plan: 'pro', isPro: true, proValidUntil: null },
        });

        return;
      }

      if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = asStringId(subscription.customer);
        if (!customerId) return;

        // Find user by customer id.
        const stripeCustomer = await tx.stripeCustomer.findUnique({
          where: { stripeCustomerId: customerId },
          select: { userId: true, stripeMode: true },
        });
        if (!stripeCustomer) return;
        if (stripeCustomer.stripeMode !== stripeMode) return;

        // Upsert subscription.
        const saved = await tx.stripeSubscription.upsert({
          where: { userId: stripeCustomer.userId },
          create: {
            userId: stripeCustomer.userId,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: customerId,
            stripeProductId:
              typeof subscription.items.data[0]?.price?.product === 'string'
                ? subscription.items.data[0].price.product
                : null,
            stripePriceId: subscription.items.data[0]?.price?.id ?? null,
            status: subscription.status,
            currentPeriodStart: dateFromStripeTs(subscription.current_period_start) ?? undefined,
            currentPeriodEnd: dateFromStripeTs(subscription.current_period_end) ?? undefined,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            canceledAt: dateFromStripeTs(subscription.canceled_at) ?? undefined,
            endedAt: dateFromStripeTs(subscription.ended_at) ?? undefined,
            trialEnd: dateFromStripeTs(subscription.trial_end) ?? undefined,
            stripeMode,
          },
          update: {
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: customerId,
            stripeProductId:
              typeof subscription.items.data[0]?.price?.product === 'string'
                ? subscription.items.data[0].price.product
                : null,
            stripePriceId: subscription.items.data[0]?.price?.id ?? null,
            status: subscription.status,
            currentPeriodStart: dateFromStripeTs(subscription.current_period_start) ?? undefined,
            currentPeriodEnd: dateFromStripeTs(subscription.current_period_end) ?? undefined,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            canceledAt: dateFromStripeTs(subscription.canceled_at) ?? undefined,
            endedAt: dateFromStripeTs(subscription.ended_at) ?? undefined,
            trialEnd: dateFromStripeTs(subscription.trial_end) ?? undefined,
            stripeMode,
          },
        });

        const entitlement = computeEntitlementFromSubscription({ subscription: saved, stripeMode });
        await tx.user.update({
          where: { id: stripeCustomer.userId },
          data: { plan: entitlement.plan, isPro: entitlement.isPro, proValidUntil: entitlement.proValidUntil },
        });

        return;
      }

      if (event.type === 'invoice.payment_failed' || event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = asStringId(invoice.customer);
        const subscriptionId = asStringId(invoice.subscription);
        if (!customerId || !subscriptionId) return;

        const stripeCustomer = await tx.stripeCustomer.findUnique({
          where: { stripeCustomerId: customerId },
          select: { userId: true, stripeMode: true },
        });
        if (!stripeCustomer) return;
        if (stripeCustomer.stripeMode !== stripeMode) return;

        await tx.stripeSubscription.updateMany({
          where: { userId: stripeCustomer.userId, stripeMode, stripeSubscriptionId: subscriptionId },
          data: {
            latestInvoiceId: invoice.id,
            latestInvoiceStatus: typeof invoice.status === 'string' ? invoice.status : null,
          },
        });

        return;
      }
    });

    const res = NextResponse.json({ ok: true }, { status: 200 });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    console.error('stripe webhook error:', error);
    const res = NextResponse.json({ ok: false }, { status: 400 });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }
}

