import { randomBytes } from 'crypto';

import type { Prisma, PrismaClient } from '@prisma/client';
import type { NextResponse } from 'next/server';

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function shouldUseSecureCookies(requestUrl: string): boolean {
  return requestUrl.startsWith('https://');
}

function getSessionCookieName(requestUrl: string): string {
  return shouldUseSecureCookies(requestUrl)
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token';
}

export async function createDatabaseSessionForUser(
  db: PrismaClient | Prisma.TransactionClient,
  userId: string,
): Promise<{ sessionToken: string; expires: Date }> {
  const sessionToken = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await db.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  });

  return { sessionToken, expires };
}

export function attachDatabaseSessionCookie(
  response: NextResponse,
  requestUrl: string,
  sessionToken: string,
  expires: Date,
): void {
  response.cookies.set({
    name: getSessionCookieName(requestUrl),
    value: sessionToken,
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookies(requestUrl),
    path: '/',
    expires,
  });
}
