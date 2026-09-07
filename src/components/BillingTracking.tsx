'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { trackAnalyticsEvent } from '@/lib/analytics/events';

type BillingTrackingProps = {
  showStatus?: boolean;
};

export default function BillingTracking({ showStatus = true }: BillingTrackingProps) {
  const searchParams = useSearchParams();
  const billing = searchParams.get('billing');
  const billingRef = searchParams.get('billing_ref');
  const billingFlow = searchParams.get('billing_flow');

  useEffect(() => {
    const eventName = billing === 'success'
      ? 'checkout_completed'
      : billing === 'cancel'
        ? 'checkout_canceled'
        : null;
    if (!eventName) return;

    const dedupeKey = billingRef
      ? `ga4:${eventName}:${billingRef}`
      : `ga4:${eventName}:${window.location.pathname}:${window.location.search}`;
    try {
      if (window.sessionStorage.getItem(dedupeKey)) return;
      window.sessionStorage.setItem(dedupeKey, '1');
    } catch {
      // Storage unavailable: React's mounted instance still sends only once.
    }

    trackAnalyticsEvent(eventName, {
      event_source: billing === 'success' ? 'verified_billing_return' : 'account_return',
      ...(billingFlow ? { billing_flow: billingFlow } : {}),
    });
  }, [billing, billingFlow, billingRef]);

  if (!showStatus) return null;

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
