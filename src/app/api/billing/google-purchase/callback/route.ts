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

function safeErrorToObject(error: unknown): Record<string, unknown> {
  if (!error || typeof error !== 'object') return { type: typeof error };
  const e = error as Record<string, unknown>;
  return {
    name: e.name,
    message: e.message,
    code: e.code,
    stack:
      typeof e.stack === 'string'
        ? e.stack
            .split('\n')
            .slice(0, 3)
            .join('\n')
        : undefined,
  };
}

function debugLog(
  runId: string,
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
) {
  return fetch('http://127.0.0.1:7243/ingest/d5b9b24e-cf56-4f8e-b90c-eeb7b2ed6fe0', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '54f1f6',
    },
    body: JSON.stringify({
      sessionId: '54f1f6',
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}

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

function redirectWithBillingReason(path: string, reason: string): NextResponse {
  const target = new URL(path, getSiteUrl());
  target.searchParams.set('billing_reason', reason);
  const res = NextResponse.redirect(target);
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
  let stage = 'entry';
  const runId = `callback-${Date.now()}`;

  try {
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

    stage = 'pending-google-purchase';
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
    stage = 'google-token';
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

    stage = 'google-userinfo';
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

    // #region agent log
    await debugLog(runId, 'H1-H4', 'src/app/api/billing/google-purchase/callback/route.ts:159', 'google callback identity resolved', {
      stripeMode,
      pendingId: pending.id,
      emailHashPrefix: emailHash.slice(0, 12),
      emailVerified,
    });
    // #endregion

    stage = 'existing-user-check';
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, isPro: true },
    });
    // #region agent log
    await debugLog(runId, 'H1', 'src/app/api/billing/google-purchase/callback/route.ts:170', 'existing user lookup result', {
      hasExistingUser: !!existingUser,
      existingUserIsPro: existingUser?.isPro ?? false,
    });
    // #endregion
    if (existingUser?.isPro) {
      // #region agent log
      await debugLog(runId, 'H1', 'src/app/api/billing/google-purchase/callback/route.ts:176', 'redirecting already_pro from user.isPro', {
        hasExistingUser: true,
      });
      // #endregion
      return redirectWithBillingReason('/?buyPro=1&billing=already_pro', 'user_is_pro');
    }

    if (existingUser?.id) {
      stage = 'existing-subscription-check';
      const existingSub = await prisma.stripeSubscription.findFirst({
        where: { userId: existingUser.id, stripeMode },
        orderBy: { updatedAt: 'desc' },
      });
      const entitlement = computeEntitlementFromSubscription({ subscription: existingSub, stripeMode });
      // #region agent log
      await debugLog(runId, 'H2-H3', 'src/app/api/billing/google-purchase/callback/route.ts:189', 'existing billing state evaluated', {
        hasExistingSub: !!existingSub,
        subscriptionStatus: existingSub?.status ?? null,
        entitlementIsPro: entitlement.isPro,
      });
      // #endregion
      if (entitlement.isPro) {
        // #region agent log
        await debugLog(runId, 'H2', 'src/app/api/billing/google-purchase/callback/route.ts:196', 'redirecting already_pro from entitlement', {
          subscriptionStatus: existingSub?.status ?? null,
        });
        // #endregion
        return redirectWithBillingReason('/?buyPro=1&billing=already_pro', 'subscription_entitlement');
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
        // #region agent log
        await debugLog(runId, 'H3', 'src/app/api/billing/google-purchase/callback/route.ts:211', 'managed stripe customer evaluated', {
          hasStripeCustomer: true,
          customerMode: stripeCustomer.stripeMode,
          hasManagedStripeSubscription,
        });
        // #endregion
        if (hasManagedStripeSubscription) {
          // #region agent log
          await debugLog(runId, 'H3', 'src/app/api/billing/google-purchase/callback/route.ts:219', 'redirecting already_pro from managed stripe customer', {
            customerMode: stripeCustomer.stripeMode,
          });
          // #endregion
          return redirectWithBillingReason('/?buyPro=1&billing=already_pro', 'managed_customer_subscription');
        }
      }
    }

    stage = 'email-subscription-check';
    const hasBlockingByEmail = await hasBlockingStripeSubscriptionByEmail({ stripe, email });
    // #region agent log
    await debugLog(runId, 'H4', 'src/app/api/billing/google-purchase/callback/route.ts:231', 'email-based stripe lookup evaluated', {
      hasBlockingByEmail,
      emailHashPrefix: emailHash.slice(0, 12),
    });
    // #endregion
    if (hasBlockingByEmail) {
      // #region agent log
      await debugLog(runId, 'H4', 'src/app/api/billing/google-purchase/callback/route.ts:237', 'redirecting already_pro from email-based stripe lookup', {
        emailHashPrefix: emailHash.slice(0, 12),
      });
      // #endregion
      return redirectWithBillingReason('/?buyPro=1&billing=already_pro', 'email_matched_subscription');
    }

    const priceId = getProPriceId();
    const emailEnc = encryptEmail(email);
    const expiresAt = new Date(Date.now() + GOOGLE_PURCHASE_TTL_MINUTES * 60 * 1000);

    stage = 'create-checkout-session';
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

    // #region agent log
    await debugLog(runId, 'H1-H4', 'src/app/api/billing/google-purchase/callback/route.ts:276', 'google callback created checkout session', {
      pendingId: pending.id,
      hasSessionUrl: !!session.url,
    });
    // #endregion

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
  } catch (error) {
    // #region agent log
    await debugLog(runId, 'H1-H4', 'src/app/api/billing/google-purchase/callback/route.ts:298', 'google callback threw', {
      stage,
      error: safeErrorToObject(error),
    });
    // #endregion
    throw error;
  }
}
