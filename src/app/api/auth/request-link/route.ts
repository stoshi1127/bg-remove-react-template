import { NextResponse } from 'next/server';
import { Resend } from 'resend';

import { prisma } from '@/lib/db';
import { normalizeEmail, isValidEmail } from '@/lib/auth/email';
import { createMagicLinkToken } from '@/lib/auth/magicLink';
import { getSiteUrl } from '@/lib/auth/siteUrl';

export const runtime = 'nodejs';

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }
  return new Resend(apiKey);
}

function getEmailFrom(): string {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error('EMAIL_FROM is not set');
  }
  return from;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { email?: unknown } | null;
    const rawEmail = typeof body?.email === 'string' ? body.email : '';
    const email = normalizeEmail(rawEmail);

    // Always return 200 for privacy, but validate to avoid useless DB/email work.
    if (!isValidEmail(email)) {
      const res = NextResponse.json({ ok: true }, { status: 200 });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    // “会員＝課金者” のため、ログイン時に User を新規作成しない。
    // 存在しない場合もプライバシーのため常に 200 を返す（メール送信もしない）。
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    if (!user) {
      const res = NextResponse.json({ ok: true }, { status: 200 });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    // Basic throttle: if the last token was created within 60s, do nothing.
    const lastToken = await prisma.authToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (lastToken && Date.now() - lastToken.createdAt.getTime() < 60_000) {
      const res = NextResponse.json({ ok: true }, { status: 200 });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    const { token } = await createMagicLinkToken(user.id);
    const siteUrl = getSiteUrl();
    const callbackUrl = `${siteUrl}/auth/callback?token=${encodeURIComponent(token)}`;

    const resend = getResendClient();
    const from = getEmailFrom();

    await resend.emails.send({
      from,
      to: user.email,
      subject: 'QuickTools ログインリンク',
      html: `
        <p>QuickTools（イージーカット）へのログインリンクです。</p>
        <p><a href="${callbackUrl}">ログインする</a></p>
        <p>このリンクは一定時間で無効になります。心当たりがない場合は、このメールを破棄してください。</p>
      `.trim(),
    });

    const res = NextResponse.json({ ok: true }, { status: 200 });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    console.error('request-link error:', error);
    // Still avoid leaking account existence; only expose generic failure.
    const res = NextResponse.json({ ok: false, error: 'Failed to send login link' }, { status: 500 });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }
}

