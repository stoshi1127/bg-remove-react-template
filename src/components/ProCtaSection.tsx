'use client';

import { useState } from 'react';
import Link from 'next/link';
import GuestProPurchase from './GuestProPurchase';
import PricingTable from './PricingTable';
import PricingModal from './PricingModal';
import PremiumFeatures from './PremiumFeatures';

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
      <div id="pro" className="mb-12 scroll-mt-28">
        <div className="bg-gradient-to-br from-white via-amber-50/30 to-orange-50/50 rounded-2xl border border-amber-100 shadow-sm p-6 md:p-8 lg:p-10 max-w-5xl mx-auto">
          <div className="text-center mb-10 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 tracking-tight">
              高画質・無制限のProプラン
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
              もっと綺麗に、もっと自由に。より高品質な画像加工を求める方へ。<br className="hidden md:block" />
              Proなら、広告なし・高精度の背景透過・AI背景合成・最大25MBの出力が可能です。
            </p>
          </div>

          <div className="w-full">
            <PricingTable
              variant="full"
              source="top_cta"
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
                            Proプランを購入する
                          </button>
                        }
                      />
                      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
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
