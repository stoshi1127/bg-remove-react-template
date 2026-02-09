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
    // #region agent log
    if (process.env.NODE_ENV === 'development') {
      fetch('http://127.0.0.1:7243/ingest/d5b9b24e-cf56-4f8e-b90c-eeb7b2ed6fe0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H_env_or_mode',location:'src/app/api/billing/checkout/route.ts:entry',message:'billing.checkout.entry',data:{billingEnabled:isBillingEnabled(),stripeMode:getStripeMode(),stripeKeyKind:safeKeyKind(process.env.STRIPE_SECRET_KEY),hasPriceTest:!!process.env.STRIPE_PRICE_ID_PRO_TEST,hasPriceLive:!!process.env.STRIPE_PRICE_ID_PRO_LIVE,vercelEnv:process.env.VERCEL_ENV ?? null},timestamp:Date.now()})}).catch(()=>{});
    }
    // #endregion agent log
    console.info('[billing.checkout] entry', {
      billingEnabled: isBillingEnabled(),
      stripeMode: getStripeMode(),
      stripeKeyKind: safeKeyKind(process.env.STRIPE_SECRET_KEY),
      hasPriceTest: !!process.env.STRIPE_PRICE_ID_PRO_TEST,
      hasPriceLive: !!process.env.STRIPE_PRICE_ID_PRO_LIVE,
      vercelEnv: process.env.VERCEL_ENV ?? null,
    });

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

    const stripeMode = getStripeMode();
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
      const res = NextResponse.json(
        { ok: false, error: 'Stripe mode mismatch for this user' },
        { status: 409 },
      );
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    if (entitlement.isPro) {
      if (!stripeCustomer) {
        const res = NextResponse.json({ ok: true, kind: 'already_pro' }, { status: 200 });
        res.headers.set('Cache-Control', 'no-store');
        return res;
      }

      const portal = await stripe.billingPortal.sessions.create({
        customer: stripeCustomer.stripeCustomerId,
        return_url: `${siteUrl}/account`,
      });

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
      const res = NextResponse.json({ ok: false, error: 'Failed to create checkout session' }, { status: 500 });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    const res = NextResponse.json({ ok: true, url: session.url }, { status: 200 });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    // #region agent log
    if (process.env.NODE_ENV === 'development') {
      fetch('http://127.0.0.1:7243/ingest/d5b9b24e-cf56-4f8e-b90c-eeb7b2ed6fe0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H_stripe_error',location:'src/app/api/billing/checkout/route.ts:catch',message:'billing.checkout.error',data:{error:stripeErrorToObject(error),stripeMode:getStripeMode(),stripeKeyKind:safeKeyKind(process.env.STRIPE_SECRET_KEY),hasPriceTest:!!process.env.STRIPE_PRICE_ID_PRO_TEST,hasPriceLive:!!process.env.STRIPE_PRICE_ID_PRO_LIVE,vercelEnv:process.env.VERCEL_ENV ?? null},timestamp:Date.now()})}).catch(()=>{});
    }
    // #endregion agent log
    console.error('billing checkout error:', stripeErrorToObject(error));
    const res = NextResponse.json({ ok: false, error: 'Failed to start checkout' }, { status: 500 });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }
}

