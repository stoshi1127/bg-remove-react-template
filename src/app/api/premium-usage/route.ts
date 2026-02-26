import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { getPremiumUsage } from '@/lib/premiumUsage';

export const runtime = 'nodejs';

/**
 * GET /api/premium-usage
 * Pro会員のプレミアムAI残回数を返す。
 * 未ログイン・Free会員の場合は 401 または 200 + { available: false }。
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const usage = await getPremiumUsage(user.id, user.isPro);

  if (!usage) {
    return NextResponse.json({
      available: false,
      message: 'Pro会員のみプレミアムAIが利用できます',
    });
  }

  return NextResponse.json({
    available: true,
    used: usage.used,
    remaining: usage.remaining,
    limit: usage.limit,
    yearMonth: usage.yearMonth,
  });
}
