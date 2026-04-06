import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { normalizeEmail } from '@/lib/auth/email';
import { getSiteUrl } from '@/lib/auth/siteUrl';
import { hashNormalizedEmail, sha256Hex } from '@/lib/billing/crypto';
import { getStripeClient } from '@/lib/billing/stripe';
import { getStripeMode } from '@/lib/billing/stripeMode';
import { getProPriceId, isBillingEnabled } from '@/lib/billing/config';
import { encryptEmail } from '@/lib/billing/pendingCheckoutEmail';
import { GOOGLE_PURCHASE_TTL_MINUTES } from '@/lib/billing/googlePurchase';
import { computeEntitlementFromSubscription } from '@/lib/billing/entitlement';
import {
  hasBlockingStripeSubscription,
  hasBlockingStripeSubscriptionByEmail,
} from '@/lib/billing/subscriptionGuard';

export const runtime = 'nodejs';

const GOOGLE_PURCHASE_STATE_COOKIE = 'google-purchase-state';

type GoogleTokenResponse = {
  access_token?: unknown;
};

type GoogleUserInfoResponse = {
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
  picture?: unknown;
};

function redirectWithStatus(path: string): NextResponse {
  const res = NextResponse.redirect(new URL(path, getSiteUrl()));
  res.cookies.set({
    name: GOOGLE_PURCHASE_STATE_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: getSiteUrl().startsWith('https://'),
    path: '/',
    expires: new Date(0),
  });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const siteUrl = getSiteUrl();

  if (!isBillingEnabled()) {
    return redirectWithStatus('/?billing=disabled');
  }

  const state = url.searchParams.get('state') ?? '';
  const code = url.searchParams.get('code') ?? '';
  const oauthError = url.searchParams.get('error');
  const cookieState = req.headers.get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${GOOGLE_PURCHASE_STATE_COOKIE}=`))
    ?.slice(`${GOOGLE_PURCHASE_STATE_COOKIE}=`.length) ?? '';

  if (oauthError || !state || !code || !cookieState || cookieState !== state) {
    return redirectWithStatus('/?buyPro=1&billing=google_auth_failed');
  }

  const stripeMode = getStripeMode();
  const stateHash = sha256Hex(state);
  const now = new Date();

  await prisma.pendingGooglePurchase.deleteMany({
    where: {
      OR: [{ expiresAt: { lte: now } }, { usedAt: { not: null } }],
    },
  });

  const pending = await prisma.pendingGooglePurchase.findUnique({
    where: { stateHash },
    select: { id: true, stripeMode: true, expiresAt: true, usedAt: true },
  });

  if (!pending || pending.stripeMode !== stripeMode || pending.expiresAt <= now || pending.usedAt) {
    return redirectWithStatus('/?buyPro=1&billing=google_auth_failed');
  }

  const redirectUri = `${siteUrl}/api/billing/google-purchase/callback`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.AUTH_GOOGLE_ID ?? '',
      client_secret: process.env.AUTH_GOOGLE_SECRET ?? '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
    cache: 'no-store',
  });

  if (!tokenRes.ok) {
    return redirectWithStatus('/?buyPro=1&billing=google_auth_failed');
  }

  const tokenJson = (await tokenRes.json().catch(() => null)) as GoogleTokenResponse | null;
  const accessToken =
    tokenJson && typeof tokenJson.access_token === 'string' ? tokenJson.access_token : null;
  if (!accessToken) {
    return redirectWithStatus('/?buyPro=1&billing=google_auth_failed');
  }

  const userInfoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });

  if (!userInfoRes.ok) {
    return redirectWithStatus('/?buyPro=1&billing=google_auth_failed');
  }

  const userInfo = (await userInfoRes.json().catch(() => null)) as GoogleUserInfoResponse | null;
  const googleSub = userInfo && typeof userInfo.sub === 'string' ? userInfo.sub : null;
  const emailRaw = userInfo && typeof userInfo.email === 'string' ? userInfo.email : null;
  const emailVerified = userInfo?.email_verified === true;
  const name = userInfo && typeof userInfo.name === 'string' ? userInfo.name : null;
  const image = userInfo && typeof userInfo.picture === 'string' ? userInfo.picture : null;

  if (!googleSub || !emailRaw || !emailVerified) {
    return redirectWithStatus('/?buyPro=1&billing=google_auth_failed');
  }

  const email = normalizeEmail(emailRaw);
  const emailHash = hashNormalizedEmail(email);
  const stripe = getStripeClient();

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isPro: true },
  });
  if (existingUser?.isPro) {
    return redirectWithStatus('/?buyPro=1&billing=already_pro');
  }

  if (existingUser?.id) {
    const existingSub = await prisma.stripeSubscription.findFirst({
      where: { userId: existingUser.id, stripeMode },
      orderBy: { updatedAt: 'desc' },
    });
    const entitlement = computeEntitlementFromSubscription({ subscription: existingSub, stripeMode });
    if (entitlement.isPro) {
      return redirectWithStatus('/?buyPro=1&billing=already_pro');
    }

    const stripeCustomer = await prisma.stripeCustomer.findUnique({
      where: { userId: existingUser.id },
      select: { stripeCustomerId: true, stripeMode: true },
    });
    if (stripeCustomer?.stripeMode === stripeMode) {
      const hasManagedStripeSubscription = await hasBlockingStripeSubscription({
        stripe,
        customerId: stripeCustomer.stripeCustomerId,
      });
      if (hasManagedStripeSubscription) {
        return redirectWithStatus('/?buyPro=1&billing=already_pro');
      }
    }
  }

  if (await hasBlockingStripeSubscriptionByEmail({ stripe, email })) {
    return redirectWithStatus('/?buyPro=1&billing=already_pro');
  }

  const priceId = getProPriceId();
  const emailEnc = encryptEmail(email);
  const expiresAt = new Date(Date.now() + GOOGLE_PURCHASE_TTL_MINUTES * 60 * 1000);

  await prisma.pendingGooglePurchase.update({
    where: { id: pending.id },
    data: {
      googleSub,
      emailEnc,
      emailHash,
      name,
      image,
      authorizedAt: now,
      expiresAt,
    },
  });

  const successUrl = `${siteUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${siteUrl}/?buyPro=1&billing=cancel`;
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
      pendingGooglePurchaseId: pending.id,
    },
    subscription_data: {
      metadata: {
        plan: 'pro',
        stripeMode,
        pendingGooglePurchaseId: pending.id,
      },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  });

  if (!session.url) {
    return redirectWithStatus('/?buyPro=1&billing=checkout_failed');
  }

  await prisma.pendingGooglePurchase.update({
    where: { id: pending.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  const res = NextResponse.redirect(session.url);
  res.cookies.set({
    name: GOOGLE_PURCHASE_STATE_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: siteUrl.startsWith('https://'),
    path: '/',
    expires: new Date(0),
  });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
