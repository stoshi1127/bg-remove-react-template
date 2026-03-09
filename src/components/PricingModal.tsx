'use client';

import { useEffect } from 'react';
import { trackAnalyticsEvent } from '@/lib/analytics/events';
import PricingTable from './PricingTable';
import PremiumFeatures from './PremiumFeatures';

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
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 transition-colors z-10"
          aria-label="閉じる"
        >
          <span className="text-2xl leading-none">×</span>
        </button>

        <div className="flex flex-col items-center gap-1 mb-8">
          <h2 id="pricing-modal-title" className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            最適なプランをお選びください
          </h2>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 text-center mt-2 max-w-2xl">
            QuickTools イージーカットは、AIの力であなたの写真編集を劇的に進化させます。
          </p>
        </div>

        <PricingTable
          variant="full"
          source={source}
          renderProCta={
            showPurchaseCta && onPurchaseClick
              ? () => (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      trackAnalyticsEvent('pro_purchase_click', { source });
                      onPurchaseClick();
                    }}
                    className="w-full py-4 bg-pro-orange text-white rounded-xl font-bold shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-all transform active:scale-95 text-base"
                  >
                    Proを購入する
                  </button>
                  <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-3">
                    メールアドレスまたは<br />
                    Googleアカウントですぐに登録できます
                  </p>
                </div>
              )
              : undefined
          }
        />

        <div className="pt-8 border-t border-gray-100 dark:border-slate-800 mt-8">
          <PremiumFeatures />
        </div>
      </div>
    </div>
  );
}
