import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { getSiteUrl } from '@/lib/auth/siteUrl';
import { generateRandomToken, sha256Hex } from '@/lib/billing/crypto';
import { getStripeMode } from '@/lib/billing/stripeMode';
import { isBillingEnabled } from '@/lib/billing/config';
import { GOOGLE_PURCHASE_TTL_MINUTES } from '@/lib/billing/googlePurchase';

export const runtime = 'nodejs';

const GOOGLE_PURCHASE_STATE_COOKIE = 'google-purchase-state';

function shouldUseSecureCookies(siteUrl: string): boolean {
  return siteUrl.startsWith('https://');
}

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
      runId: 'initial',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}

export async function GET() {
  let stage = 'entry';

  try {
    const siteUrl = getSiteUrl();
    const fallbackUrl = new URL('/?buyPro=1&billing=google_unavailable', siteUrl);

    // #region agent log
    await debugLog('H1', 'src/app/api/billing/google-purchase/start/route.ts:44', 'google purchase start entry', {
      billingEnabled: isBillingEnabled(),
      hasGoogleId: !!process.env.AUTH_GOOGLE_ID,
      hasGoogleSecret: !!process.env.AUTH_GOOGLE_SECRET,
      hasExplicitSiteUrl: !!process.env.NEXT_PUBLIC_SITE_URL,
      hasVercelUrl: !!process.env.VERCEL_URL,
      siteUrl,
    });
    // #endregion

    if (!isBillingEnabled()) {
      return NextResponse.redirect(new URL('/?billing=disabled', siteUrl));
    }

    if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET) {
      // #region agent log
      await debugLog('H3', 'src/app/api/billing/google-purchase/start/route.ts:58', 'google oauth env missing, redirecting to fallback', {
        hasGoogleId: !!process.env.AUTH_GOOGLE_ID,
        hasGoogleSecret: !!process.env.AUTH_GOOGLE_SECRET,
      });
      // #endregion
      return NextResponse.redirect(fallbackUrl);
    }

    const stripeMode = getStripeMode();
    const state = generateRandomToken(16);
    const stateHash = sha256Hex(state);
    const expiresAt = new Date(Date.now() + GOOGLE_PURCHASE_TTL_MINUTES * 60 * 1000);

    stage = 'prisma-delete-expired';
    // #region agent log
    await debugLog('H2', 'src/app/api/billing/google-purchase/start/route.ts:72', 'before pending google purchase cleanup', {
      stripeMode,
      expiresAtIso: expiresAt.toISOString(),
    });
    // #endregion
    await prisma.pendingGooglePurchase.deleteMany({
      where: {
        OR: [{ expiresAt: { lte: new Date() } }, { usedAt: { not: null } }],
      },
    });

    stage = 'prisma-create-pending';
    await prisma.pendingGooglePurchase.create({
      data: {
        stateHash,
        stripeMode,
        expiresAt,
      },
    });
    // #region agent log
    await debugLog('H2', 'src/app/api/billing/google-purchase/start/route.ts:87', 'pending google purchase created', {
      stripeMode,
      stateHashPrefix: stateHash.slice(0, 12),
    });
    // #endregion

    stage = 'build-google-auth-url';
    const redirectUri = `${siteUrl}/api/billing/google-purchase/callback`;
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', process.env.AUTH_GOOGLE_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'online');
    authUrl.searchParams.set('include_granted_scopes', 'true');
    authUrl.searchParams.set('prompt', 'select_account');

    // #region agent log
    await debugLog('H4', 'src/app/api/billing/google-purchase/start/route.ts:101', 'google auth url constructed', {
      redirectUri,
      secureCookie: shouldUseSecureCookies(siteUrl),
      authOrigin: authUrl.origin,
    });
    // #endregion

    const res = NextResponse.redirect(authUrl);
    res.cookies.set({
      name: GOOGLE_PURCHASE_STATE_COOKIE,
      value: state,
      httpOnly: true,
      sameSite: 'lax',
      secure: shouldUseSecureCookies(siteUrl),
      path: '/',
      maxAge: 60 * 15,
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    // #region agent log
    await debugLog(
      'H1-H2-H4',
      'src/app/api/billing/google-purchase/start/route.ts:120',
      'google purchase start threw',
      {
        stage,
        error: safeErrorToObject(error),
      },
    );
    // #endregion
    throw error;
  }
}
