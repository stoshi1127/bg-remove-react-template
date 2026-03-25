import { NextResponse } from 'next/server';

import type { Prisma } from '@prisma/client';
import type Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { normalizeEmail } from '@/lib/auth/email';
import { getStripeClient } from '@/lib/billing/stripe';
import { getStripeMode } from '@/lib/billing/stripeMode';
import { computeEntitlementFromSubscription } from '@/lib/billing/entitlement';
import { decryptEmail } from '@/lib/billing/pendingCheckoutEmail';

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

function getPrismaErrorCode(e: unknown): string | null {
  if (!e || typeof e !== 'object') return null;
  const rec = e as Record<string, unknown>;
  return typeof rec.code === 'string' ? rec.code : null;
}

function dateFromUnixTs(ts: number | null | undefined): Date | null {
  return typeof ts === 'number' && Number.isFinite(ts) ? new Date(ts * 1000) : null;
}

function getFiniteNumber(rec: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = rec[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function getBooleanValue(rec: Record<string, unknown>, ...keys: string[]): boolean | null {
  for (const key of keys) {
    const value = rec[key];
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return null;
}

function derivePeriodRangeFromItems(subscription: Stripe.Subscription): {
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
} {
  const itemStarts = subscription.items.data
    .map((item) => dateFromUnixTs((item as unknown as { current_period_start?: number }).current_period_start))
    .filter((value): value is Date => value instanceof Date);
  const itemEnds = subscription.items.data
    .map((item) => dateFromUnixTs((item as unknown as { current_period_end?: number }).current_period_end))
    .filter((value): value is Date => value instanceof Date);

  const currentPeriodStart =
    itemStarts.length > 0
      ? new Date(Math.max(...itemStarts.map((value) => value.getTime())))
      : null;
  const currentPeriodEnd =
    itemEnds.length > 0
      ? new Date(Math.min(...itemEnds.map((value) => value.getTime())))
      : null;

  return { currentPeriodStart, currentPeriodEnd };
}

async function upsertSubscriptionFromStripe(args: {
  tx: Prisma.TransactionClient;
  userId: string;
  stripeMode: 'test' | 'live';
  stripeCustomerId: string;
  subscription: Stripe.Subscription;
}) {
  const subscriptionRec = args.subscription as unknown as Record<string, unknown>;
  const firstItem = args.subscription.items.data[0];
  const price = firstItem?.price ?? null;
  const itemPeriods = derivePeriodRangeFromItems(args.subscription);
  const currentPeriodStart =
    dateFromUnixTs(getFiniteNumber(subscriptionRec, 'current_period_start', 'currentPeriodStart')) ??
    itemPeriods.currentPeriodStart;
  const currentPeriodEnd =
    dateFromUnixTs(getFiniteNumber(subscriptionRec, 'current_period_end', 'currentPeriodEnd')) ??
    itemPeriods.currentPeriodEnd;
  const canceledAt = dateFromUnixTs(getFiniteNumber(subscriptionRec, 'canceled_at', 'canceledAt'));
  const endedAt = dateFromUnixTs(getFiniteNumber(subscriptionRec, 'ended_at', 'endedAt'));
  const trialEnd = dateFromUnixTs(getFiniteNumber(subscriptionRec, 'trial_end', 'trialEnd'));
  const latestInvoice =
    typeof args.subscription.latest_invoice === 'string'
      ? { id: args.subscription.latest_invoice, status: null }
      : args.subscription.latest_invoice;

  const saved = await args.tx.stripeSubscription.upsert({
    where: { userId: args.userId },
    create: {
      userId: args.userId,
      stripeSubscriptionId: args.subscription.id,
      stripeCustomerId: args.stripeCustomerId,
      stripeProductId: price?.product ? asStripeId(price.product) : null,
      stripePriceId: price?.id ?? null,
      status: args.subscription.status,
      currentPeriodStart: currentPeriodStart ?? null,
      currentPeriodEnd: currentPeriodEnd ?? null,
      cancelAtPeriodEnd:
        getBooleanValue(subscriptionRec, 'cancel_at_period_end', 'cancelAtPeriodEnd') ?? false,
      canceledAt: canceledAt ?? null,
      endedAt: endedAt ?? null,
      trialEnd: trialEnd ?? null,
      latestInvoiceId: latestInvoice?.id ?? null,
      latestInvoiceStatus: latestInvoice?.status ?? null,
      stripeMode: args.stripeMode,
    },
    update: {
      stripeSubscriptionId: args.subscription.id,
      stripeCustomerId: args.stripeCustomerId,
      stripeProductId: price?.product ? asStripeId(price.product) : null,
      stripePriceId: price?.id ?? null,
      status: args.subscription.status,
      currentPeriodStart: currentPeriodStart ?? null,
      currentPeriodEnd: currentPeriodEnd ?? null,
      cancelAtPeriodEnd:
        getBooleanValue(subscriptionRec, 'cancel_at_period_end', 'cancelAtPeriodEnd') ?? false,
      canceledAt: canceledAt ?? null,
      endedAt: endedAt ?? null,
      trialEnd: trialEnd ?? null,
      latestInvoiceId: latestInvoice?.id ?? null,
      latestInvoiceStatus: latestInvoice?.status ?? null,
      stripeMode: args.stripeMode,
    },
  });

  const entitlement = computeEntitlementFromSubscription({
    subscription: saved,
    stripeMode: args.stripeMode,
  });
  await args.tx.user.update({
    where: { id: args.userId },
    data: {
      plan: entitlement.plan,
      isPro: entitlement.isPro,
      proValidUntil: entitlement.proValidUntil,
    },
  });
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
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // TS servers can lag behind Prisma client generation for TransactionClient delegates.
      // Define a minimal delegate shape locally (no secrets, no any).
      type PendingCheckoutDelegate = {
        findUnique: (args: unknown) => Promise<unknown>;
        updateMany: (args: {
          where: {
            id?: string;
            stripeCheckoutSessionId?: string;
            stripeMode: 'test' | 'live';
            expiresAt: { gt: Date };
            completedAt: null;
          };
          data: {
            stripeCheckoutSessionId?: string;
            completedAt?: Date;
          };
        }) => Promise<{ count: number }>;
        deleteMany: (args: unknown) => Promise<{ count: number }>;
      };
      const itx = tx as unknown as Prisma.TransactionClient & { pendingCheckout: PendingCheckoutDelegate };

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
        const pendingCheckoutId =
          getString(metadata, 'pendingCheckoutId') ?? getString(session, 'client_reference_id');
        const customerId = asStripeId(session.customer);
        const sessionId = getString(session, 'id');
        const legacyUserId = getString(metadata, 'userId');

        if (!customerId) return;

        const now = new Date();
        // Reduce PII retention (best-effort).
        await itx.pendingCheckout.deleteMany({
          where: {
            OR: [{ expiresAt: { lte: now } }, { usedAt: { not: null } }],
          },
        });

        // New flow: "会員＝課金者" -> create user only after successful payment (using PendingCheckout email).
        let userId: string | null = null;
        if (pendingCheckoutId) {
          const pendingUnknown = await itx.pendingCheckout.findUnique({
            where: { id: pendingCheckoutId },
            select: {
              id: true,
              emailEnc: true,
              stripeMode: true,
              expiresAt: true,
              completedAt: true,
              usedAt: true,
            },
          });
          const pending = asRecord(pendingUnknown);
          const pendingStripeMode = pending ? getString(pending, 'stripeMode') : null;
          const expiresAt = pending && pending.expiresAt instanceof Date ? pending.expiresAt : null;
          const usedAt = pending && pending.usedAt instanceof Date ? pending.usedAt : null;
          const emailEnc = pending ? getString(pending, 'emailEnc') : null;

          if (
            pending &&
            pendingStripeMode === stripeMode &&
            expiresAt &&
            expiresAt.getTime() > now.getTime() &&
            !usedAt &&
            emailEnc
          ) {
            const email = normalizeEmail(decryptEmail(emailEnc));
            const user = await tx.user.upsert({
              where: { email },
              create: { email, plan: 'pro', isPro: true, proValidUntil: null },
              update: { plan: 'pro', isPro: true, proValidUntil: null },
              select: { id: true },
            });
            userId = user.id;
          }
        }

        // Legacy fallback (older flow wrote userId into metadata).
        userId ??= legacyUserId;
        if (!userId) return;

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

        const subscriptionId = asStripeId(session.subscription);
        if (subscriptionId) {
          const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['latest_invoice'],
          });
          await upsertSubscriptionFromStripe({
            tx,
            userId,
            stripeMode,
            stripeCustomerId: customerId,
            subscription: stripeSubscription,
          });
        }

        // Link/activate PendingCheckout (best-effort).
        if (pendingCheckoutId) {
          await itx.pendingCheckout.updateMany({
            where: {
              id: pendingCheckoutId,
              stripeMode,
              expiresAt: { gt: now },
              completedAt: null,
            },
            data: {
              stripeCheckoutSessionId: sessionId ?? undefined,
              completedAt: now,
            },
          });
        } else if (sessionId) {
          await itx.pendingCheckout.updateMany({
            where: {
              stripeCheckoutSessionId: sessionId,
              stripeMode,
              expiresAt: { gt: now },
              completedAt: null,
            },
            data: { completedAt: now },
          });
        }

        return;
      }

      if (
        event.type === 'customer.subscription.created' ||
        event.type === 'customer.subscription.updated' ||
        event.type === 'customer.subscription.deleted'
      ) {
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

        const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ['latest_invoice'],
        });
        await upsertSubscriptionFromStripe({
          tx,
          userId: stripeCustomer.userId,
          stripeMode,
          stripeCustomerId: customerId,
          subscription: stripeSubscription,
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

