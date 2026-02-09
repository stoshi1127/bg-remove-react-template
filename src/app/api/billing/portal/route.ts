import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { getSiteUrl } from '@/lib/auth/siteUrl';
import { getStripeClient } from '@/lib/billing/stripe';
import { getStripeMode } from '@/lib/billing/stripeMode';
import { isBillingEnabled } from '@/lib/billing/config';

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
    const stripeCustomer = await prisma.stripeCustomer.findUnique({
      where: { userId: user.id },
      select: { stripeCustomerId: true, stripeMode: true },
    });

    if (!stripeCustomer) {
      const res = NextResponse.json({ ok: false, error: 'No Stripe customer for this user' }, { status: 404 });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    if (stripeCustomer.stripeMode !== stripeMode) {
      const res = NextResponse.json(
        { ok: false, error: 'Stripe mode mismatch for this user' },
        { status: 409 },
      );
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    const stripe = getStripeClient();
    const siteUrl = getSiteUrl();

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomer.stripeCustomerId,
      return_url: `${siteUrl}/account`,
    });

    const res = NextResponse.json({ ok: true, url: portalSession.url }, { status: 200 });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    console.error('billing portal error:', error);
    const res = NextResponse.json({ ok: false, error: 'Failed to create portal session' }, { status: 500 });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }
}

