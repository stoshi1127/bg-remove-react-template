'use client';

import { useEffect, useState } from 'react';
import { trackAnalyticsEvent } from '@/lib/analytics/events';

type PremiumUsageData = {
  available: true;
  used: number;
  remaining: number;
  limit: number;
  yearMonth: string;
} | {
  available: false;
  message?: string;
};

type AccountPremiumUsageProps = {
  isPro: boolean;
};

export default function AccountPremiumUsage({ isPro }: AccountPremiumUsageProps) {
  const [data, setData] = useState<PremiumUsageData | null>(null);
  const [viewedRef, setViewedRef] = useState(false);

  useEffect(() => {
    if (!isPro) return;

    let cancelled = false;
    fetch('/api/premium-usage')
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });

    return () => {
      cancelled = true;
    };
  }, [isPro]);

  useEffect(() => {
    if (!viewedRef && data?.available) {
      setViewedRef(true);
      trackAnalyticsEvent('premium_ai_remaining_view', { location: 'account' });
    }
  }, [data, viewedRef]);

  if (!isPro || !data?.available) return null;

  const { remaining, used, limit, yearMonth } = data;

  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4">
      <div className="text-sm font-semibold text-purple-800 mb-1">プレミアムAI</div>
      <p className="text-sm text-gray-700">
        今月（{yearMonth}）あと <strong className="text-purple-700">{remaining}回</strong> 使えます
        （{used}/{limit}回使用中）
      </p>
      <p className="text-xs text-gray-500 mt-1">
        自然な背景合成・プロンプトから背景生成など。来月にリセットされます。
      </p>
    </div>
  );
}
