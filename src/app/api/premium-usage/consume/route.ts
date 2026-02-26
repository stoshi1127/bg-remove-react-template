import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { getPremiumUsage, consumePremiumUsage } from '@/lib/premiumUsage';

export const runtime = 'nodejs';

/**
 * POST /api/premium-usage/consume
 * プレミアムAI使用回数を1消費する。
 * Body: { feature?: string } （将来の計測用）
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Body: { feature?: string } は将来の計測用に受け付ける（未使用）

  // 事前チェック: 残りが0なら消費しない
  const current = await getPremiumUsage(user.id, user.isPro);
  if (!current || current.remaining <= 0) {
    return NextResponse.json(
      {
        ok: false,
        reason: current ? 'no_remaining' : 'not_pro',
        message: current
          ? '今月のプレミアムAI回数を使い切りました。来月にリセットされます。'
          : 'Pro会員のみプレミアムAIが利用できます',
      },
      { status: 403 }
    );
  }

  const result = await consumePremiumUsage(user.id, user.isPro);

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: result.reason,
        message:
          result.reason === 'no_remaining'
            ? '今月のプレミアムAI回数を使い切りました。'
            : 'Pro会員のみプレミアムAIが利用できます',
      },
      { status: 403 }
    );
  }

  const updated = await getPremiumUsage(user.id, user.isPro);
  return NextResponse.json({
    ok: true,
    remaining: updated?.remaining ?? 0,
    used: updated?.used ?? 0,
    limit: updated?.limit ?? 30,
  });
}
