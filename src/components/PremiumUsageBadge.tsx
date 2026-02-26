'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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

type PremiumUsageBadgeProps = {
  isPro: boolean;
  className?: string;
};

export default function PremiumUsageBadge({ isPro, className = '' }: PremiumUsageBadgeProps) {
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
      trackAnalyticsEvent('premium_ai_remaining_view', { location: 'header' });
    }
  }, [data, viewedRef]);

  if (!isPro || !data?.available) return null;

  const { remaining, used, limit } = data;

  return (
    <Link
      href="/account"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 transition-colors ${className}`}
      title={`プレミアムAI: 今月あと${remaining}回使えます（${used}/${limit}回使用）`}
    >
      <span className="text-purple-600" aria-hidden>
        AI
      </span>
      <span>残り{remaining}回</span>
    </Link>
  );
}
