import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { normalizeEmail, isValidEmail } from '@/lib/auth/email';
import { getSiteUrl } from '@/lib/auth/siteUrl';
import { generateRandomToken, sha256Hex } from '@/lib/auth/crypto';
import { getStripeClient } from '@/lib/billing/stripe';
import { getStripeMode } from '@/lib/billing/stripeMode';
import { getProPriceId, isBillingEnabled } from '@/lib/billing/config';
import { computeEntitlementFromSubscription } from '@/lib/billing/entitlement';
import { encryptEmail, hashNormalizedEmail } from '@/lib/billing/pendingCheckoutEmail';

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

    // “会員＝課金者” のため、購入開始時点では User を作らない。
    // 既に課金者（Pro）なら二重課金防止として購入は開始せず、ログイン導線へ。
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, plan: true, isPro: true },
    });
    if (existingUser?.isPro) {
      const res = NextResponse.json({ ok: true, kind: 'already_pro' }, { status: 200 });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    // Additional guard: if a stale free user exists (e.g. created by older logic),
    // still prevent double charge if their subscription indicates Pro.
    if (existingUser?.id) {
      const existingSub = await prisma.stripeSubscription.findFirst({
        where: { userId: existingUser.id, stripeMode },
        orderBy: { updatedAt: 'desc' },
      });
      const entitlement = computeEntitlementFromSubscription({ subscription: existingSub, stripeMode });
      if (entitlement.isPro) {
        const res = NextResponse.json({ ok: true, kind: 'already_pro' }, { status: 200 });
        res.headers.set('Cache-Control', 'no-store');
        return res;
      }
    }

    const stripe = getStripeClient();
    const siteUrl = getSiteUrl();
    const priceId = getProPriceId();

    // Cleanup expired/consumed pending records (best-effort, reduces PII retention).
    const now = new Date();
    await prisma.pendingCheckout.deleteMany({
      where: {
        OR: [{ expiresAt: { lte: now } }, { usedAt: { not: null } }],
      },
    });

    // Create pending checkout proof.
    const token = generateRandomToken(32);
    const tokenHash = sha256Hex(token);
    const expiresAt = new Date(Date.now() + PENDING_TTL_MINUTES * 60 * 1000);
    const emailEnc = encryptEmail(email);
    const emailHash = hashNormalizedEmail(email);

    const pending = await prisma.pendingCheckout.create({
      data: {
        emailEnc,
        emailHash,
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
      customer_email: email,
      client_reference_id: pending.id,
      metadata: {
        plan: 'pro',
        stripeMode,
        pendingCheckoutId: pending.id,
      },
      subscription_data: {
        metadata: {
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

