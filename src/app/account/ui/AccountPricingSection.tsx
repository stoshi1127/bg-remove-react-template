'use client';

import PricingTable from '@/components/PricingTable';

type AccountPricingSectionProps = {
  isPro: boolean;
};

export default function AccountPricingSection({ isPro }: AccountPricingSectionProps) {
  return (
    <div>
      <div className="mb-4">
        <span className="text-sm font-semibold text-gray-800">FreeとProの違い</span>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200/60 overflow-hidden p-4">
        <PricingTable variant="full" source="account" currentPlan={isPro ? 'pro' : 'free'} />
      </div>
    </div>
  );
}
