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
      <div id="pro" className="animate-fade-in-up mb-12 scroll-mt-28" style={{ animationDelay: '0.2s' }}>
        <div className="relative rounded-3xl bg-gradient-to-br from-amber-500 via-amber-400 to-orange-400 p-[1px] shadow-2xl overflow-hidden">
          {/* 光沢エフェクト */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>

          <div className="relative bg-white/95 backdrop-blur-xl rounded-[calc(1.5rem-1px)] p-6 md:p-8 overflow-hidden z-10">
            {/* 装飾的な背景要素 */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>

            <div className="relative text-center mb-8">
              <span className="inline-block py-1 px-3 rounded-full bg-amber-100/80 text-amber-800 text-sm font-bold tracking-widest uppercase mb-4 border border-amber-200/50 shadow-sm">
                Premium Plan
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">
                もっと綺麗に、もっと自由に。
                <br className="sm:hidden" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
                  Proプラン
                </span>
                で広がる可能性
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
                高画質出力、広告なし、無制限の背景カスタマイズ。AIの力を最大限に引き出し、プロレベルの画像作成を体験してください。
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {[
                { icon: '🚀', text: '高速処理', bg: 'bg-blue-50/80', textCol: 'text-blue-700', border: 'border-blue-100' },
                { icon: '✨', text: '完全無料でも十分', bg: 'bg-emerald-50/80', textCol: 'text-emerald-700', border: 'border-emerald-100' },
                { icon: '🔒', text: '安全・安心', bg: 'bg-gray-50/80', textCol: 'text-gray-700', border: 'border-gray-200' },
                { icon: '⚡️', text: '最大30枚一括', bg: 'bg-purple-50/80', textCol: 'text-purple-700', border: 'border-purple-100' },
              ].map((badge, i) => (
                <div key={i} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border backdrop-blur-sm ${badge.bg} ${badge.textCol} ${badge.border} shadow-sm transition-transform hover:scale-105`}>
                  <span>{badge.icon}</span>
                  {badge.text}
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-center bg-gray-50/50 rounded-2xl p-1 border border-gray-100">
              {/* 簡易比較表 */}
              <div className="w-full">
                <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">プラン比較</h3>
                        <p className="text-xs text-gray-500 font-medium">Free vs Pro</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPricingModalOpen(true)}
                      className="text-sm font-bold text-amber-600 hover:text-white bg-amber-50 hover:bg-amber-500 px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-1 group border border-amber-200 hover:border-amber-500 shadow-sm"
                    >
                      すべての機能を見る
                      <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  <PricingTable variant="compact" source="top_cta" />
                </div>
              </div>

              {/* 決済・アクションエリア */}
              <div className="w-full lg:w-72 flex flex-col justify-center p-4">
                <div className="text-center mb-6">
                  <p className="text-4xl font-black text-gray-900 tracking-tight">
                    ¥780<span className="text-base font-bold text-gray-500 ml-1">/月</span>
                  </p>
                  <p className="text-sm font-medium text-amber-600 mt-2 bg-amber-50 inline-block px-3 py-1 rounded-full">
                    いつでも解約可能
                  </p>
                </div>

                {!isLoggedIn ? (
                  <div className="flex flex-col gap-3">
                    <GuestProPurchase
                      open={guestPurchaseOpen}
                      onOpenChange={setGuestPurchaseOpen}
                    />
                    <p className="text-xs text-gray-500 text-center px-4 leading-relaxed">
                      メールアドレスだけで簡単に登録できます。
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <Link
                      href="/account"
                      className="w-full inline-flex items-center justify-center px-6 py-4 rounded-xl font-bold text-white bg-gray-900 hover:bg-black transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    >
                      ログイン済み：アカウントへ
                      <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                    <p className="text-xs text-center text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      プランの確認・管理はアカウントページから行えます。
                    </p>
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
