'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { trackAnalyticsEvent } from '@/lib/analytics/events';

export default function BillingTracking() {
  const searchParams = useSearchParams();
  const billing = searchParams.get('billing');

  useEffect(() => {
    if (billing === 'success') {
      trackAnalyticsEvent('checkout_completed', { source: 'account_return' });
    }
    if (billing === 'cancel') {
      trackAnalyticsEvent('checkout_canceled', { source: 'account_return' });
    }
  }, [billing]);

  if (billing === 'success') {
    return (
      <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        Proの購入が完了しました。反映に少し時間がかかる場合は、数秒後に再読み込みしてください。
      </div>
    );
  }

  if (billing === 'cancel') {
    return (
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        購入手続きをキャンセルしました。必要なときに、もう一度「Proを購入する」から再開できます。
      </div>
    );
  }

  if (billing === 'already_pro') {
    return (
      <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        すでに有効なPro契約があるため、購入画面ではなく管理画面をご利用ください。
      </div>
    );
  }

  return null;
}
