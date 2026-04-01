'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { trackPageView } from '@/lib/analytics/events';

export default function AnalyticsPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;

    const query = searchParams.toString();
    const path = query ? `${pathname}?${query}` : pathname;

    if (lastTrackedPathRef.current === path) return;
    lastTrackedPathRef.current = path;

    trackPageView(path, document.title);
  }, [pathname, searchParams]);

  return null;
}
