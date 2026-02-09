import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { getSiteUrl } from '@/lib/auth/siteUrl';
import { getStripeClient } from '@/lib/billing/stripe';
import { getStripeMode } from '@/lib/billing/stripeMode';
import { getProPriceId, isBillingEnabled } from '@/lib/billing/config';
import { computeEntitlementFromSubscription } from '@/lib/billing/entitlement';

export const runtime = 'nodejs';

export async function POST() {
  try {
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
    console.error('billing checkout error:', error);
    const res = NextResponse.json({ ok: false, error: 'Failed to start checkout' }, { status: 500 });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }
}

