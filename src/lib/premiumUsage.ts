import { prisma } from '@/lib/db';

export const PREMIUM_AI_MONTHLY_LIMIT = 30;

/** 現在のカレンダー月を YYYY-MM 形式で返す */
export function getCurrentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export type PremiumUsageResult = {
  used: number;
  remaining: number;
  limit: number;
  yearMonth: string;
};

/**
 * Pro会員のプレミアムAI残回数を取得。
 * Free会員の場合は null を返す。
 */
export async function getPremiumUsage(
  userId: string,
  isPro: boolean
): Promise<PremiumUsageResult | null> {
  if (!isPro) return null;

  const yearMonth = getCurrentYearMonth();

  const record = await prisma.premiumUsage.findUnique({
    where: { userId_yearMonth: { userId, yearMonth } },
  });

  const used = record?.usedCount ?? 0;
  const remaining = Math.max(0, PREMIUM_AI_MONTHLY_LIMIT - used);

  return {
    used,
    remaining,
    limit: PREMIUM_AI_MONTHLY_LIMIT,
    yearMonth,
  };
}

/**
 * プレミアムAI使用回数を1消費する。
 * 呼び出し前に getPremiumUsage で remaining > 0 を確認すること。
 * 残りが0の場合は false、成功時は true。
 */
export async function consumePremiumUsage(
  userId: string,
  isPro: boolean
): Promise<{ ok: true } | { ok: false; reason: 'not_pro' | 'no_remaining' }> {
  if (!isPro) return { ok: false, reason: 'not_pro' };

  const yearMonth = getCurrentYearMonth();

  const record = await prisma.premiumUsage.upsert({
    where: { userId_yearMonth: { userId, yearMonth } },
    create: { userId, yearMonth, usedCount: 1 },
    update: { usedCount: { increment: 1 } },
  });

  if (record.usedCount > PREMIUM_AI_MONTHLY_LIMIT) {
    return { ok: false, reason: 'no_remaining' };
  }

  return { ok: true };
}
