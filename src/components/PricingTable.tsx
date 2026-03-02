'use client';

import { useEffect, useRef } from 'react';
import { trackAnalyticsEvent } from '@/lib/analytics/events';

type PricingTableVariant = 'compact' | 'full';

type PricingTableProps = {
  variant?: PricingTableVariant;
  source: 'top_cta' | 'modal' | 'account';
  className?: string;
};

const COMPARISON_ROWS: Array<{ label: string; free: string; pro: string }> = [
  { label: '料金', free: '無料', pro: '¥780/月' },
  { label: '広告', free: 'あり', pro: 'なし' },
  { label: '高精度透過', free: '×', pro: '○' },
  { label: '写真の処理', free: '最大4MB（4MB以上は圧縮）', pro: '最大25MBの超高解像度' },
  { label: '高画質化機能', free: '×', pro: '○' },
  {
    label: '背景合成',
    free: 'テンプレート・単色',
    pro: 'テンプレート・単色・任意背景・AI生成・自然な合成',
  },
  {
    label: 'プレミアムAI',
    free: '×',
    pro: '月30回（AIで背景を作る。消しゴムマジック・背景生成塗り足しも予定）',
  },
];

export default function PricingTable({
  variant = 'full',
  source,
  className = '',
}: PricingTableProps) {
  const viewedRef = useRef(false);

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    trackAnalyticsEvent('pricing_table_view', { source });
  }, [source]);

  const rows = variant === 'compact' ? COMPARISON_ROWS.slice(0, 4) : COMPARISON_ROWS;

  return (
    <div className={`overflow-x-auto ${className}`} role="region" aria-label="FreeとProの比較">
      <table className="w-full min-w-[280px] text-sm border-collapse">
        <thead>
          <tr>
            <th className="py-3 px-3 font-semibold text-gray-500 text-s tracking-wider uppercase border-b border-gray-200 w-32 sm:w-36">
              機能・特徴
            </th>
            <th className="text-center py-3 px-2 font-semibold text-gray-600 border-b border-gray-200 border-l border-gray-200/60">
              <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md text-xs font-medium">Free</span>
            </th>
            <th className="text-center py-3 px-2 font-bold text-gray-900 border-b border-gray-200 bg-amber-50/50 border-l border-amber-200/60">
              <span className="bg-gray-900 text-white px-3 py-1 rounded-md text-xs font-medium shadow-sm">Pro</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
              <td className="py-3 px-3 text-gray-700 text-xs sm:text-sm font-medium leading-relaxed">{row.label}</td>
              <td className="py-3 px-2 text-center text-gray-500 text-xs sm:text-sm border-l border-gray-100">
                {row.free === '○' ? (
                  <svg className="w-5 h-5 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                ) : row.free === '×' ? (
                  <svg className="w-5 h-5 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                ) : row.free}
              </td>
              <td className="py-3 px-2 text-center text-amber-800 font-semibold bg-amber-50/50 text-xs sm:text-sm border-l border-amber-100/60">
                {row.pro === '○' ? (
                  <svg className="w-5 h-5 mx-auto text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                ) : row.pro === '×' ? (
                  <svg className="w-5 h-5 mx-auto text-amber-300/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                ) : row.pro}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
