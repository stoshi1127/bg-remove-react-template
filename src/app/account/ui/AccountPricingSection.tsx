'use client';

import { useState } from 'react';
import PricingTable from '@/components/PricingTable';
import PricingModal from '@/components/PricingModal';

type AccountPricingSectionProps = {
  isPro: boolean;
};

export default function AccountPricingSection({ isPro }: AccountPricingSectionProps) {
  const [pricingModalOpen, setPricingModalOpen] = useState(false);

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-800">FreeとProの違い</span>
          <button
            type="button"
            onClick={() => setPricingModalOpen(true)}
            className="text-sm font-medium text-amber-700 hover:text-amber-800 underline"
          >
            くわしく見る
          </button>
        </div>
        <PricingTable variant="compact" source="account" />
      </div>

      <PricingModal
        open={pricingModalOpen}
        onClose={() => setPricingModalOpen(false)}
        source="account"
        showPurchaseCta={!isPro}
        onPurchaseClick={!isPro ? () => setPricingModalOpen(false) : undefined}
      />
    </>
  );
}
