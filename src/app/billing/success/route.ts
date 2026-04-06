import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { normalizeEmail } from '@/lib/auth/email';
import { getStripeClient } from '@/lib/billing/stripe';
import { getStripeMode } from '@/lib/billing/stripeMode';
import { decryptEmail } from '@/lib/billing/pendingCheckoutEmail';
import { attachDatabaseSessionCookie, createDatabaseSessionForUser } from '@/lib/auth/sessionCookie';
import { upsertGooglePurchaseUser } from '@/lib/billing/googlePurchase';

export const runtime = 'nodejs';

// Removed manual session cookie setting as NextAuth handles it.

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

    // New flow: "会員＝課金者" -> create user only after successful payment.
    const pendingGooglePurchaseId =
      typeof session.metadata?.pendingGooglePurchaseId === 'string'
        ? session.metadata.pendingGooglePurchaseId
        : null;
    const pendingCheckoutId =
      (typeof session.metadata?.pendingCheckoutId === 'string' ? session.metadata.pendingCheckoutId : null) ??
      (!pendingGooglePurchaseId && typeof session.client_reference_id === 'string'
        ? session.client_reference_id
        : null);

    if (pendingGooglePurchaseId) {
      const now = new Date();
      await prisma.pendingGooglePurchase.deleteMany({
        where: {
          OR: [{ expiresAt: { lte: now } }, { usedAt: { not: null } }],
        },
      });

      const pendingGoogle = await prisma.pendingGooglePurchase.findUnique({
        where: { id: pendingGooglePurchaseId },
        select: {
          id: true,
          googleSub: true,
          emailEnc: true,
          name: true,
          image: true,
          stripeMode: true,
          expiresAt: true,
          usedAt: true,
        },
      });

      if (
        !pendingGoogle ||
        pendingGoogle.stripeMode !== stripeMode ||
        pendingGoogle.expiresAt.getTime() <= now.getTime() ||
        pendingGoogle.usedAt ||
        !pendingGoogle.googleSub ||
        !pendingGoogle.emailEnc
      ) {
        return NextResponse.redirect(new URL('/login?error=expired_checkout', url));
      }

      const email = normalizeEmail(decryptEmail(pendingGoogle.emailEnc));
      const { userId } = await upsertGooglePurchaseUser(prisma, {
        email,
        googleSub: pendingGoogle.googleSub,
        name: pendingGoogle.name,
        image: pendingGoogle.image,
      });

      await prisma.pendingGooglePurchase.updateMany({
        where: { id: pendingGooglePurchaseId, stripeMode, usedAt: null },
        data: { usedAt: now },
      });

      const res = NextResponse.redirect(new URL('/account?billing=success', url));
      const { sessionToken, expires } = await createDatabaseSessionForUser(prisma, userId);
      attachDatabaseSessionCookie(res, req.url, sessionToken, expires);
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    if (!pendingCheckoutId) {
      return NextResponse.redirect(new URL('/login?error=missing_checkout', url));
    }

    // Reduce PII retention (best-effort).
    const now = new Date();
    await prisma.pendingCheckout.deleteMany({
      where: {
        OR: [{ expiresAt: { lte: now } }, { usedAt: { not: null } }],
      },
    });

    const pending = await prisma.pendingCheckout.findUnique({
      where: { id: pendingCheckoutId },
      select: { id: true, emailEnc: true, stripeMode: true, expiresAt: true, usedAt: true },
    });

    if (!pending || pending.stripeMode !== stripeMode || pending.expiresAt.getTime() <= now.getTime() || pending.usedAt) {
      return NextResponse.redirect(new URL('/login?error=expired_checkout', url));
    }

    const email = normalizeEmail(decryptEmail(pending.emailEnc));
    await prisma.user.upsert({
      where: { email },
      create: { email, plan: 'pro', isPro: true, proValidUntil: null, lastLoginAt: now },
      update: { plan: 'pro', isPro: true, proValidUntil: null, lastLoginAt: now },
      select: { id: true },
    });

    // Mark pending checkout consumed (best-effort).
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

    // Under NextAuth, we cannot manually create session tokens easily in this API route.
    // Instead, we redirect the user to the login page so they can receive a magic link
    // to their newly created Pro account.
    const res = NextResponse.redirect(new URL('/login?billing=success', url));
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    console.error('billing success error:', error);
    return NextResponse.redirect(new URL('/?billing=verify_failed', url));
  }
}
