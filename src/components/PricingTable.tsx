'use client';

import { useEffect, useRef } from 'react';
import { trackAnalyticsEvent } from '@/lib/analytics/events';

type PricingTableVariant = 'compact' | 'full';

type PricingTableProps = {
  variant?: PricingTableVariant;
  source: 'top_cta' | 'modal' | 'account';
  className?: string;
};

const COMPARISON_ROWS = [
  { label: '料金', free: '無料', pro: '¥780/月' },
  { label: '広告', free: 'あり', pro: 'なし' },
  { label: '髪の毛までくっきり切り抜き', free: '×', pro: '○' },
  { label: '大きな写真もそのまま処理', free: '4MB/8MP目安', pro: '25MB/90MP目安' },
  { label: '1K/2K/4Kまで拡大・高画質化', free: '×', pro: '○' },
  {
    label: '好きな背景に合成',
    free: 'テンプレート・単色のみ',
    pro: 'テンプレート・単色・背景画像アップロード・プレミアムAI',
  },
  {
    label: 'プレミアムAI',
    free: '×',
    pro: '月30回（AIで背景を作る。消しゴムマジック・背景生成塗り足しも予定）',
  },
] as const;

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
            <th className="text-left py-2 px-3 font-semibold text-gray-700 border-b border-gray-200">
              項目
            </th>
            <th className="text-center py-2 px-3 font-semibold text-gray-700 border-b border-gray-200 w-24">
              無料
            </th>
            <th className="text-center py-2 px-3 font-semibold text-amber-700 border-b border-amber-200 w-24 bg-amber-50/50">
              Pro
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-gray-100">
              <td className="py-2 px-3 text-gray-800">{row.label}</td>
              <td className="py-2 px-3 text-center text-gray-600">{row.free}</td>
              <td className="py-2 px-3 text-center text-amber-800 font-medium bg-amber-50/30">
                {row.pro}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-gray-500">
        Proは月額780円。広告なし・高精度・大きな画像・プレミアムAIが使えます。
      </p>
    </div>
  );
}
