import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { getSiteUrl } from '@/lib/auth/siteUrl';
import { getStripeClient } from '@/lib/billing/stripe';
import { getStripeMode } from '@/lib/billing/stripeMode';
import { getProPriceId, isBillingEnabled } from '@/lib/billing/config';
import { computeEntitlementFromSubscription } from '@/lib/billing/entitlement';

export const runtime = 'nodejs';

function safeKeyKind(secretKey: string | undefined): 'live' | 'test' | 'unknown' | 'missing' {
  if (!secretKey) return 'missing';
  if (secretKey.startsWith('sk_live_')) return 'live';
  if (secretKey.startsWith('sk_test_')) return 'test';
  return 'unknown';
}

function stripeErrorToObject(error: unknown): Record<string, unknown> {
  if (!error || typeof error !== 'object') return { type: typeof error };
  const e = error as Record<string, unknown>;
  // Do NOT include raw objects/headers; keep it small + safe.
  return {
    name: e.name,
    type: e.type,
    code: e.code,
    message: e.message,
    statusCode: e.statusCode,
    requestId: e.requestId,
    rawType: e.rawType,
    param: e.param,
  };
}

export async function POST() {
  try {
    const vercelEnv = process.env.VERCEL_ENV ?? null;
    const stripeKeyKind = safeKeyKind(process.env.STRIPE_SECRET_KEY);
    const stripeMode = getStripeMode();

    console.info('[billing.checkout] entry', {
      billingEnabled: isBillingEnabled(),
      stripeMode,
      stripeKeyKind,
      hasPriceTest: !!process.env.STRIPE_PRICE_ID_PRO_TEST,
      hasPriceLive: !!process.env.STRIPE_PRICE_ID_PRO_LIVE,
      vercelEnv,
    });

    // Config guards: avoid confusing 500s from Stripe when env is mis-set.
    if (vercelEnv === 'preview' && stripeKeyKind === 'live') {
      console.error('[billing.checkout] blocked_live_key_in_preview', {
        vercelEnv,
        stripeMode,
        stripeKeyKind,
      });
      const res = NextResponse.json(
        {
          ok: false,
          error:
            'Preview環境ではStripeのテストキー（sk_test_...）を設定してください（本番キーでは課金を作成できません）。',
        },
        { status: 400 },
      );
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    if (stripeKeyKind === 'test' && stripeMode === 'live') {
      console.error('[billing.checkout] stripe_mode_mismatch', {
        vercelEnv,
        stripeMode,
        stripeKeyKind,
      });
      const res = NextResponse.json(
        { ok: false, error: 'Stripe設定が不整合です（STRIPE_MODE と STRIPE_SECRET_KEY が一致していません）。' },
        { status: 500 },
      );
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    if (!isBillingEnabled()) {
      const res = NextResponse.json({ ok: false, error: 'Billing is disabled' }, { status: 403 });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    const user = await getCurrentUser();
    if (!user) {
      const res = NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    // stripeMode computed earlier (and validated)
    const siteUrl = getSiteUrl();
    const stripe = getStripeClient();
    const priceId = getProPriceId();

    // Double-charge prevention: if user already effectively Pro, redirect to portal instead.
    const existingSub = await prisma.stripeSubscription.findFirst({
      where: { userId: user.id, stripeMode },
      orderBy: { updatedAt: 'desc' },
    });
    const entitlement = computeEntitlementFromSubscription({ subscription: existingSub, stripeMode });

    const stripeCustomer = await prisma.stripeCustomer.findUnique({
      where: { userId: user.id },
      select: { stripeCustomerId: true, stripeMode: true },
    });

    // Mode mixing protection
    if (stripeCustomer && stripeCustomer.stripeMode !== stripeMode) {
      console.warn('[billing.checkout] stripe_customer_mode_mismatch', {
        stripeMode,
        customerMode: stripeCustomer.stripeMode,
      });
      const res = NextResponse.json(
        { ok: false, error: 'Stripe mode mismatch for this user' },
        { status: 409 },
      );
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    if (entitlement.isPro) {
      if (!stripeCustomer) {
        console.info('[billing.checkout] already_pro_without_customer', { stripeMode });
        const res = NextResponse.json({ ok: true, kind: 'already_pro' }, { status: 200 });
        res.headers.set('Cache-Control', 'no-store');
        return res;
      }

      const portal = await stripe.billingPortal.sessions.create({
        customer: stripeCustomer.stripeCustomerId,
        return_url: `${siteUrl}/account`,
      });

      console.info('[billing.checkout] already_pro_portal', { stripeMode, hasUrl: !!portal.url });
      const res = NextResponse.json({ ok: true, kind: 'portal', url: portal.url }, { status: 200 });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    const successUrl = `${siteUrl}/account?billing=success`;
    const cancelUrl = `${siteUrl}/account?billing=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer: stripeCustomer?.stripeCustomerId,
      customer_email: stripeCustomer ? undefined : user.email,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        plan: 'pro',
        stripeMode,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      subscription_data: {
        metadata: { userId: user.id, plan: 'pro', stripeMode },
      },
    });

    if (!session.url) {
      console.error('[billing.checkout] checkout_session_missing_url', { stripeMode, sessionId: session.id });
      const res = NextResponse.json({ ok: false, error: 'Failed to create checkout session' }, { status: 500 });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    console.info('[billing.checkout] checkout_session_created', { stripeMode, sessionId: session.id });
    const res = NextResponse.json({ ok: true, url: session.url }, { status: 200 });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    console.error('billing checkout error:', stripeErrorToObject(error));
    const res = NextResponse.json({ ok: false, error: 'Failed to start checkout' }, { status: 500 });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }
}

