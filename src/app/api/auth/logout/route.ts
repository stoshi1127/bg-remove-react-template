import { NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/lib/auth/constants';
import { revokeSessionByToken } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;

    if (token) {
      await revokeSessionByToken(token);
    }

    const res = NextResponse.json({ ok: true }, { status: 200 });
    res.headers.set('Cache-Control', 'no-store');
    res.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    });
    return res;
  } catch (error) {
    console.error('logout error:', error);
    const res = NextResponse.json({ ok: false, error: 'Failed to logout' }, { status: 500 });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }
}

