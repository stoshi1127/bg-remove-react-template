import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/lib/auth/constants';

export function middleware(req: NextRequest) {
  // Allow guest access for billing success redirect (auto-login happens there).
  if (req.nextUrl.pathname === '/billing/success') {
    return NextResponse.next();
  }

  const session = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!session) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/account/:path*', '/billing/:path*'],
};

