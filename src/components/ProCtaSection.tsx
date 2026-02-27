'use client';

import { useState } from 'react';
import Link from 'next/link';
import GuestProPurchase from './GuestProPurchase';
import PricingTable from './PricingTable';
import PricingModal from './PricingModal';

type ProCtaSectionProps = {
  isLoggedIn: boolean;
};

export default function ProCtaSection({ isLoggedIn }: ProCtaSectionProps) {
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [guestPurchaseOpen, setGuestPurchaseOpen] = useState(false);

  const handlePurchaseFromPricingModal = () => {
    setPricingModalOpen(false);
    setGuestPurchaseOpen(true);
  };

  return (
    <>
      <div id="pro" className="animate-fade-in-up mb-8 scroll-mt-28" style={{ animationDelay: '0.2s' }}>
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
          <div className="flex flex-wrap justify-center gap-3 mb-4">
            <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              完全無料
            </span>
            <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              高速処理
            </span>
            <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              安全・安心
            </span>
            <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              最大30枚一括処理
            </span>
          </div>

          {/* 簡易比較表 */}
          <div className="mb-6 rounded-2xl bg-gradient-to-br from-amber-200 via-amber-100 to-orange-100 p-1 shadow-sm">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-gray-800 tracking-tight">FreeとProの違い</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 rounded-full">Compare</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPricingModalOpen(true)}
                  className="text-sm font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  くわしく見る
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <PricingTable variant="compact" source="top_cta" />
            </div>
          </div>

          {!isLoggedIn ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <GuestProPurchase
                open={guestPurchaseOpen}
                onOpenChange={setGuestPurchaseOpen}
              />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/account"
                className="inline-flex items-center px-6 py-3 rounded-xl font-semibold bg-gray-900 text-white hover:bg-black transition-colors"
              >
                アカウントへ
              </Link>
              <p className="text-sm text-gray-600">プラン/請求の確認・管理はアカウントから行えます。</p>
            </div>
          )}
        </div>
      </div>

      <PricingModal
        open={pricingModalOpen}
        onClose={() => setPricingModalOpen(false)}
        source="top_cta"
        showPurchaseCta={!isLoggedIn}
        onPurchaseClick={!isLoggedIn ? handlePurchaseFromPricingModal : undefined}
      />
    </>
  );
}
