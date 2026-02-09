import { NextResponse } from 'next/server';

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

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
}

function asStripeId(v: unknown): string | null {
  const direct = asStringId(v);
  if (direct) return direct;
  const rec = asRecord(v);
  return rec ? asStringId(rec.id) : null;
}

function getString(rec: Record<string, unknown>, key: string): string | null {
  return asStringId(rec[key]);
}

function getNumber(rec: Record<string, unknown>, key: string): number | null {
  const v = rec[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function getBoolean(rec: Record<string, unknown>, key: string): boolean | null {
  const v = rec[key];
  return typeof v === 'boolean' ? v : null;
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
        const session = asRecord(event.data.object);
        if (!session) return;

        const metadata = asRecord(session.metadata) ?? {};
        const userId = getString(metadata, 'userId') ?? getString(session, 'client_reference_id');
        const customerId = asStripeId(session.customer);

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
        const subscription = asRecord(event.data.object);
        if (!subscription) return;

        const subscriptionId = getString(subscription, 'id');
        const status = getString(subscription, 'status');
        const customerId = asStripeId(subscription.customer);
        if (!customerId) return;
        if (!subscriptionId || !status) return;

        // Find user by customer id.
        const stripeCustomer = await tx.stripeCustomer.findUnique({
          where: { stripeCustomerId: customerId },
          select: { userId: true, stripeMode: true },
        });
        if (!stripeCustomer) return;
        if (stripeCustomer.stripeMode !== stripeMode) return;

        // Extract price/product IDs (best-effort, supports both snake and camel).
        const items = asRecord(subscription.items);
        const dataArr = items && Array.isArray(items.data) ? items.data : [];
        const firstItem = dataArr.length > 0 ? asRecord(dataArr[0]) : null;
        const price = firstItem ? asRecord(firstItem.price) : null;
        const stripePriceId = price ? getString(price, 'id') : null;
        const stripeProductId = price ? asStripeId(price.product) : null;

        const cancelAtPeriodEnd =
          getBoolean(subscription, 'cancel_at_period_end') ??
          getBoolean(subscription, 'cancelAtPeriodEnd') ??
          false;
        const currentPeriodStart =
          dateFromStripeTs(getNumber(subscription, 'current_period_start')) ??
          dateFromStripeTs(getNumber(subscription, 'currentPeriodStart'));
        const currentPeriodEnd =
          dateFromStripeTs(getNumber(subscription, 'current_period_end')) ??
          dateFromStripeTs(getNumber(subscription, 'currentPeriodEnd'));
        const canceledAt =
          dateFromStripeTs(getNumber(subscription, 'canceled_at')) ??
          dateFromStripeTs(getNumber(subscription, 'canceledAt'));
        const endedAt =
          dateFromStripeTs(getNumber(subscription, 'ended_at')) ??
          dateFromStripeTs(getNumber(subscription, 'endedAt'));
        const trialEnd =
          dateFromStripeTs(getNumber(subscription, 'trial_end')) ??
          dateFromStripeTs(getNumber(subscription, 'trialEnd'));

        // Upsert subscription.
        const saved = await tx.stripeSubscription.upsert({
          where: { userId: stripeCustomer.userId },
          create: {
            userId: stripeCustomer.userId,
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: customerId,
            stripeProductId,
            stripePriceId,
            status,
            currentPeriodStart: currentPeriodStart ?? undefined,
            currentPeriodEnd: currentPeriodEnd ?? undefined,
            cancelAtPeriodEnd,
            canceledAt: canceledAt ?? undefined,
            endedAt: endedAt ?? undefined,
            trialEnd: trialEnd ?? undefined,
            stripeMode,
          },
          update: {
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: customerId,
            stripeProductId,
            stripePriceId,
            status,
            currentPeriodStart: currentPeriodStart ?? undefined,
            currentPeriodEnd: currentPeriodEnd ?? undefined,
            cancelAtPeriodEnd,
            canceledAt: canceledAt ?? undefined,
            endedAt: endedAt ?? undefined,
            trialEnd: trialEnd ?? undefined,
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
        const invoice = asRecord(event.data.object);
        if (!invoice) return;

        const customerId = asStripeId(invoice.customer);
        const subscriptionId = asStripeId(invoice.subscription);
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
            latestInvoiceId: getString(invoice, 'id'),
            latestInvoiceStatus: getString(invoice, 'status'),
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

