'use client';

import { useEffect, useRef } from 'react';
import { trackAnalyticsEvent } from '@/lib/analytics/events';

type PricingTableVariant = 'compact' | 'full';

type PricingTableProps = {
  variant?: PricingTableVariant;
  source: 'top_cta' | 'modal' | 'account';
  className?: string;
  renderProCta?: () => React.ReactNode;
};

// 比較する機能リスト。Stitchのデザインに合わせて表示する
const FEATURES = [
  { label: '広告表示', free: 'あり', pro: 'なし' },
  { label: '透過精度', free: '標準', pro: '高精度モデル使用可能' },
  { label: '写真の処理', free: '最大 4MB', pro: '最大 25MB (超高解像度)' },
  { label: '背景合成', free: 'テンプレート・単色', pro: 'AI生成・自然な合成' },
  { label: 'プレミアムAI', free: '利用不可', pro: '月30回まで利用可能' },
];

export default function PricingTable({
  variant = 'full', // variantは現状維持（将来のための拡張用）
  source,
  className = '',
  renderProCta,
}: PricingTableProps) {
  const viewedRef = useRef(false);

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    trackAnalyticsEvent('pricing_table_view', { source });
  }, [source]);

  const features = variant === 'compact' ? FEATURES.slice(0, 4) : FEATURES;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-stretch ${className}`} role="region" aria-label="FreeとProの比較">
      {/* Free Plan Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 flex flex-col h-full">
        <div className="mb-6 md:mb-8">
          <h2 className="text-xl font-bold mb-2">無料プラン</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">まずは登録不要で基本機能から試したい方へ</p>
          <div className="mt-4 md:mt-6">
            <span className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">¥0</span>
            <span className="text-slate-500 dark:text-slate-400">/月</span>
          </div>
        </div>
        <div className="flex-grow space-y-3 md:space-y-4 mb-6 md:mb-8">
          {features.map((feature) => (
            <div key={`free-${feature.label}`} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2 text-sm md:text-base">
                <span className={`material-symbols-outlined text-sm sm:text-base ${feature.free === '利用不可' || feature.free === '-' ? 'text-red-500' : 'text-slate-400'}`}>
                  {feature.free === '利用不可' || feature.free === '-' ? 'close' : 'check'}
                </span>
                {feature.label}
              </span>
              <span className={feature.free === '利用不可' || feature.free === '-' ? 'text-slate-400 text-sm md:text-base' : 'font-medium text-slate-800 dark:text-slate-200 text-sm md:text-base'}>{feature.free}</span>
            </div>
          ))}
        </div>
        <div className="w-full py-3 md:py-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 text-center text-sm md:text-base bg-slate-50/50 dark:bg-slate-800/50">
          現在のプラン
        </div>
      </div>

      {/* Pro Plan Card (Highlighted) */}
      <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl border-2 border-pro-orange p-6 md:p-8 flex flex-col h-full transform md:scale-[1.02] transition-transform">
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-pro-orange text-white text-[10px] md:text-xs font-bold px-3 md:px-4 py-1 rounded-full uppercase tracking-wider shadow-sm z-10 whitespace-nowrap">
          おすすめ
        </div>
        <div className="mb-6 md:mb-8">
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-gray-900 dark:text-white justify-center">
            Proプラン
            <span className="material-symbols-outlined text-pro-orange" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">全ての機能で最高のクリエイティブを</p>
          <div className="mt-4 md:mt-6">
            <span className="text-3xl md:text-4xl font-bold text-pro-orange">¥780</span>
            <span className="text-slate-500 dark:text-slate-400">/月</span>
          </div>
        </div>
        <div className="flex-grow space-y-3 md:space-y-4 mb-6 md:mb-8">
          {features.map((feature) => (
            <div key={`pro-${feature.label}`} className="flex items-center justify-between py-2 border-b border-orange-50 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2 font-medium text-sm md:text-base">
                <span className="material-symbols-outlined text-sm sm:text-base text-pro-orange" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                {feature.label}
              </span>
              <div className="flex flex-col items-end">
                <span className="font-bold text-gray-800 dark:text-white text-sm md:text-base">{feature.pro}</span>
                {feature.label === 'プレミアムAI' && (
                  <a
                    href="#premium-features"
                    className="text-[10px] text-pro-orange hover:underline mt-0.5 opacity-80"
                    onClick={() => { }}
                  >
                    プレミアムAIとは？
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
        {renderProCta && (
          <div className="mt-auto">
            {renderProCta()}
          </div>
        )}
      </div>
    </div>
  );
}
