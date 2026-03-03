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
      <div id="pro" className="mb-12 scroll-mt-28">
        <div className="bg-gradient-to-br from-white via-amber-50/30 to-orange-50/50 rounded-2xl border border-amber-100 shadow-sm p-6 md:p-8 lg:p-10 max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 tracking-tight">
              高画質・無制限のProプラン
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
              もっと綺麗に、もっと自由に。より高品質な画像加工を求める方へ。<br />
              Proは月額780円。広告なし・高精度・大きな画像・プレミアムAIが使えます。
            </p>
          </div>

          <div className="grid lg:grid-cols-[1fr_320px] gap-8 md:gap-10 items-start">
            {/* 左側：特徴と表 */}
            <div className="space-y-6 flex flex-col justify-center w-full">
              <PricingTable variant="full" source="top_cta" />
            </div>

            {/* 右側：価格とCTA */}
            <div className="flex flex-col justify-center items-center bg-white/60 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-amber-100 shadow-sm h-full w-full">
              <div className="text-center mb-8">
                <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold text-amber-700 bg-amber-100/50 rounded-full border border-amber-200/50">
                  月額
                </span>
                <p className="text-4xl font-bold text-gray-900 tracking-tight">
                  ¥780<span className="text-base font-normal text-gray-500 ml-1">/月</span>
                </p>
                <p className="text-sm text-gray-500 mt-3 font-medium">
                  いつでも解約可能
                </p>
              </div>

              <div className="w-full">
                {!isLoggedIn ? (
                  <div className="flex flex-col gap-3 w-full">
                    <GuestProPurchase
                      open={guestPurchaseOpen}
                      onOpenChange={setGuestPurchaseOpen}
                    />
                    <p className="text-xs text-gray-500 text-center leading-relaxed mt-2">
                      メールアドレスまたはGoogleアカウントですぐに登録できます
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 w-full">
                    <Link
                      href="/account"
                      className="w-full inline-flex items-center justify-center px-6 py-4 rounded-xl font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-colors shadow-sm"
                    >
                      プランを管理する
                    </Link>
                  </div>
                )}
              </div>
            </div>
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
