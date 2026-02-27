'use client';

import { useEffect } from 'react';
import { trackAnalyticsEvent } from '@/lib/analytics/events';
import PricingTable from './PricingTable';

type PricingModalProps = {
  open: boolean;
  onClose: () => void;
  source: 'top_cta' | 'modal' | 'account';
  showPurchaseCta?: boolean;
  onPurchaseClick?: () => void;
};

export default function PricingModal({
  open,
  onClose,
  source,
  showPurchaseCta = false,
  onPurchaseClick,
}: PricingModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center px-4 text-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pricing-modal-title"
    >
      <div
        className="fixed inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-gray-200 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 id="pricing-modal-title" className="text-lg font-bold text-gray-900">
              FreeとProの違い
            </h2>
            <p className="text-sm text-gray-600 mt-1 text-center">
              月額780円で、もっと自由に使えます。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <PricingTable variant="full" source={source} />

        {showPurchaseCta && onPurchaseClick && (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => {
                trackAnalyticsEvent('pro_purchase_click', { source });
                onPurchaseClick();
              }}
              className="w-full inline-flex items-center justify-center px-5 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 transition-colors"
            >
              Proを購入する（月額780円）
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
