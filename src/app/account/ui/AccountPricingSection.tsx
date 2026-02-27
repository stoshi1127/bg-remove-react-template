'use client';

import PricingTable from '@/components/PricingTable';

export default function AccountPricingSection() {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="mb-4">
        <span className="text-sm font-semibold text-gray-800">FreeとProの違い</span>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200/60 overflow-hidden">
        <PricingTable variant="full" source="account" />
      </div>
    </div>
  );
}
