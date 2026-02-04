import { NextResponse } from 'next/server';

import { consumeMagicLinkToken } from '@/lib/auth/magicLink';
import { createSession } from '@/lib/auth/session';
import { SESSION_COOKIE_NAME } from '@/lib/auth/constants';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') || '';

  if (!token) {
    const res = NextResponse.redirect(new URL('/login?error=invalid', url));
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }

  const consumed = await consumeMagicLinkToken(token);
  if (!consumed) {
    const res = NextResponse.redirect(new URL('/login?error=expired', url));
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }

  // Update last login timestamp (best-effort).
  await prisma.user.update({
    where: { id: consumed.userId },
    data: { lastLoginAt: new Date() },
  });

  const { token: sessionToken, expiresAt } = await createSession(consumed.userId);

  const res = NextResponse.redirect(new URL('/account', url));
  res.headers.set('Cache-Control', 'no-store');
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

  return res;
}

