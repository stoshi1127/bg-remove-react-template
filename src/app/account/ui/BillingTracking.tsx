'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { trackAnalyticsEvent } from '@/lib/analytics/events';

export default function BillingTracking() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('billing') === 'success') {
      trackAnalyticsEvent('checkout_completed', { source: 'account_return' });
    }
  }, [searchParams]);

  return null;
}
