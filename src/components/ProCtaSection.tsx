'use client';

import { useState } from 'react';
import Link from 'next/link';
import GuestProPurchase from './GuestProPurchase';
import PricingTable from './PricingTable';
import PricingModal from './PricingModal';
import PremiumFeatures from './PremiumFeatures';

const proHighlights = ['EC商品画像', '大量処理', '高画質出力', '広告なし'];

type ProCtaSectionProps = {
  isLoggedIn: boolean;
  isPro?: boolean;
};

export default function ProCtaSection({ isLoggedIn, isPro = false }: ProCtaSectionProps) {
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [guestPurchaseOpen, setGuestPurchaseOpen] = useState(false);

  const handlePurchaseFromPricingModal = () => {
    setPricingModalOpen(false);
    setGuestPurchaseOpen(true);
  };

  return (
    <>
      <div id="pro" className="mb-12 scroll-mt-28">
        <div className="bg-gradient-to-br from-white via-amber-50/30 to-orange-50/50 rounded-2xl border border-amber-100 shadow-sm p-6 md:p-8 lg:p-10 max-w-5xl mx-auto">
          <div className="text-center mb-10 md:mb-12">
            <p className="text-xs md:text-sm font-semibold tracking-[0.2em] text-amber-700 uppercase mb-3">
              無料で足りない場面を補う業務向けプラン
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 tracking-tight">
              EC商品画像や大量処理に向くProプラン
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto text-sm md:text-base leading-relaxed">
              無料でも背景透過と一括保存はすぐ使えます。毎日の業務で大量処理したい、より高画質で出力したい、
              広告なしで作業したい場合は Pro が向いています。
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {proHighlights.map((highlight) => (
                <span
                  key={highlight}
                  className="inline-flex items-center rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-xs md:text-sm font-semibold text-amber-800"
                >
                  {highlight}
                </span>
              ))}
            </div>
          </div>

          <div className="w-full">
            <PricingTable
              variant="full"
              source="top_cta"
              currentPlan={!isLoggedIn ? 'guest' : isPro ? 'pro' : 'free'}
              renderProCta={() => (
                <div className="flex flex-col gap-3 w-full mt-4">
                  {!isLoggedIn ? (
                    <>
                      <GuestProPurchase
                        open={guestPurchaseOpen}
                        onOpenChange={setGuestPurchaseOpen}
                        triggerButton={
                          <button
                            type="button"
                            onClick={() => setGuestPurchaseOpen(true)}
                            className="w-full py-3 md:py-4 bg-pro-orange text-white rounded-xl font-bold shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-all transform active:scale-95 text-sm md:text-base"
                          >
                            Proを購入する
                          </button>
                        }
                      />
                      <p className="text-center text-xs text-slate-500">
                        メールアドレスまたは<br />
                        Googleアカウントですぐに登録できます
                      </p>
                    </>
                  ) : (
                    <Link
                      href="/account"
                      className="w-full text-center py-3 md:py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-sm text-sm md:text-base"
                    >
                      プランを管理する
                    </Link>
                  )}
                </div>
              )}
            />

            <PremiumFeatures />
          </div>
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
