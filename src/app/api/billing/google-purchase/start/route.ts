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

export async function GET() {
  const siteUrl = getSiteUrl();
  const fallbackUrl = new URL('/?buyPro=1&billing=google_unavailable', siteUrl);

  if (!isBillingEnabled()) {
    return NextResponse.redirect(new URL('/?billing=disabled', siteUrl));
  }

  if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET) {
    return NextResponse.redirect(fallbackUrl);
  }

  const stripeMode = getStripeMode();
  const state = generateRandomToken(16);
  const stateHash = sha256Hex(state);
  const expiresAt = new Date(Date.now() + GOOGLE_PURCHASE_TTL_MINUTES * 60 * 1000);

  await prisma.pendingGooglePurchase.deleteMany({
    where: {
      OR: [{ expiresAt: { lte: new Date() } }, { usedAt: { not: null } }],
    },
  });

  await prisma.pendingGooglePurchase.create({
    data: {
      stateHash,
      stripeMode,
      expiresAt,
    },
  });

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
}
