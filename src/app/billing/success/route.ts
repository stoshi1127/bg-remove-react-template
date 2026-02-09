import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth/session';
import { SESSION_COOKIE_NAME } from '@/lib/auth/constants';
import { getStripeClient } from '@/lib/billing/stripe';
import { getStripeMode } from '@/lib/billing/stripeMode';

export const runtime = 'nodejs';

function setSessionCookie(res: NextResponse, token: string, expiresAt: Date) {
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('session_id') || '';
  const stripeMode = getStripeMode();

  if (!sessionId) {
    return NextResponse.redirect(new URL('/?billing=missing_session', url));
  }

  // 1) Verify via Stripe API that this checkout session actually succeeded.
  // (We still keep entitlements synced by webhook as the source of truth.)
  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Basic sanity checks
    if (session.mode !== 'subscription') {
      return NextResponse.redirect(new URL('/?billing=invalid_mode', url));
    }

    // payment_status exists for Checkout Sessions
    const paymentStatus = (session as unknown as { payment_status?: string }).payment_status ?? null;
    if (paymentStatus !== 'paid') {
      return NextResponse.redirect(new URL('/?billing=not_paid', url));
    }

    const userId =
      (typeof session.metadata?.userId === 'string' ? session.metadata.userId : null) ??
      (typeof session.client_reference_id === 'string' ? session.client_reference_id : null);

    if (!userId) {
      return NextResponse.redirect(new URL('/login?error=missing_user', url));
    }

    // Ensure user exists (it should; guest-checkout upserts it).
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date(), plan: 'pro', isPro: true, proValidUntil: null },
    }).catch(async () => {
      // If user does not exist, create from email if available.
      const email = typeof session.customer_details?.email === 'string' ? session.customer_details.email : null;
      if (!email) throw new Error('missing user and email');
      await prisma.user.create({ data: { id: userId, email } });
    });

    // Mark pending checkout consumed (best-effort).
    const pendingCheckoutId =
      typeof session.metadata?.pendingCheckoutId === 'string' ? session.metadata.pendingCheckoutId : null;
    if (pendingCheckoutId) {
      await prisma.pendingCheckout.updateMany({
        where: { id: pendingCheckoutId, stripeMode, usedAt: null },
        data: { usedAt: new Date() },
      });
    } else {
      await prisma.pendingCheckout.updateMany({
        where: { stripeCheckoutSessionId: sessionId, stripeMode, usedAt: null },
        data: { usedAt: new Date() },
      });
    }

    const { token, expiresAt } = await createSession(userId);
    const res = NextResponse.redirect(new URL('/account?billing=success', url));
    res.headers.set('Cache-Control', 'no-store');
    setSessionCookie(res, token, expiresAt);
    return res;
  } catch (error) {
    console.error('billing success error:', error);
    return NextResponse.redirect(new URL('/?billing=verify_failed', url));
  }
}

