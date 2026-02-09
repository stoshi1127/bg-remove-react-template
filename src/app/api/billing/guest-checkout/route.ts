import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { normalizeEmail, isValidEmail } from '@/lib/auth/email';
import { getSiteUrl } from '@/lib/auth/siteUrl';
import { generateRandomToken, sha256Hex } from '@/lib/auth/crypto';
import { getStripeClient } from '@/lib/billing/stripe';
import { getStripeMode } from '@/lib/billing/stripeMode';
import { getProPriceId, isBillingEnabled } from '@/lib/billing/config';
import { computeEntitlementFromSubscription } from '@/lib/billing/entitlement';

export const runtime = 'nodejs';

const PENDING_TTL_MINUTES = 60;

export async function POST(req: Request) {
  try {
    if (!isBillingEnabled()) {
      const res = NextResponse.json({ ok: false, error: 'Billing is disabled' }, { status: 403 });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    const body = (await req.json().catch(() => null)) as { email?: unknown } | null;
    const rawEmail = typeof body?.email === 'string' ? body.email : '';
    const email = normalizeEmail(rawEmail);

    if (!isValidEmail(email)) {
      const res = NextResponse.json({ ok: false, error: 'Invalid email' }, { status: 400 });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    const stripeMode = getStripeMode();
    const vercelEnv = process.env.VERCEL_ENV ?? null;
    const stripeKey = process.env.STRIPE_SECRET_KEY ?? '';
    if (vercelEnv === 'preview' && stripeKey.startsWith('sk_live_')) {
      const res = NextResponse.json(
        {
          ok: false,
          error: 'Preview環境ではStripeのテストキー（sk_test_...）を設定してください。',
        },
        { status: 400 },
      );
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    // Create/attach user by email (becomes “member” at purchase start).
    const user = await prisma.user.upsert({
      where: { email },
      create: { email },
      update: {},
      select: { id: true, email: true },
    });

    // Double-charge prevention (DB is source of truth).
    const existingSub = await prisma.stripeSubscription.findFirst({
      where: { userId: user.id, stripeMode },
      orderBy: { updatedAt: 'desc' },
    });
    const entitlement = computeEntitlementFromSubscription({ subscription: existingSub, stripeMode });
    if (entitlement.isPro) {
      const res = NextResponse.json({ ok: true, kind: 'already_pro' }, { status: 200 });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    const stripe = getStripeClient();
    const siteUrl = getSiteUrl();
    const priceId = getProPriceId();

    // Create pending checkout proof (hash only).
    const token = generateRandomToken(32);
    const tokenHash = sha256Hex(token);
    const expiresAt = new Date(Date.now() + PENDING_TTL_MINUTES * 60 * 1000);

    const pending = await prisma.pendingCheckout.create({
      data: {
        userId: user.id,
        tokenHash,
        stripeMode,
        expiresAt,
      },
      select: { id: true },
    });

    const successUrl = `${siteUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${siteUrl}/?billing=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        plan: 'pro',
        stripeMode,
        pendingCheckoutId: pending.id,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          plan: 'pro',
          stripeMode,
          pendingCheckoutId: pending.id,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    await prisma.pendingCheckout.update({
      where: { id: pending.id },
      data: { stripeCheckoutSessionId: session.id },
    });

    if (!session.url) {
      const res = NextResponse.json({ ok: false, error: 'Failed to create checkout session' }, { status: 500 });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    const res = NextResponse.json({ ok: true, url: session.url }, { status: 200 });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    console.error('guest-checkout error:', error);
    const res = NextResponse.json({ ok: false, error: 'Failed to start checkout' }, { status: 500 });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }
}

