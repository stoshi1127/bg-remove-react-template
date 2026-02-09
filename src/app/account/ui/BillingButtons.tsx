'use client';

import { useState } from 'react';

type CheckoutResponse =
  | { ok: true; url: string }
  | { ok: true; kind: 'portal'; url: string }
  | { ok: true; kind: 'already_pro' }
  | { ok: false; error: string };

type PortalResponse = { ok: true; url: string } | { ok: false; error: string };

export default function BillingButtons({ isPro }: { isPro: boolean }) {
  const [loading, setLoading] = useState<null | 'checkout' | 'portal'>(null);
  const [error, setError] = useState<string | null>(null);

  const extractError = (v: unknown): string | null => {
    if (!v || typeof v !== 'object') return null;
    const rec = v as Record<string, unknown>;
    return typeof rec.error === 'string' ? rec.error : null;
  };

  const goCheckout = async () => {
    setLoading('checkout');
    setError(null);
    try {
      const r = await fetch('/api/billing/checkout', { method: 'POST' });
      const data = (await r.json().catch(() => null)) as CheckoutResponse | null;
      if (!data || data.ok !== true) {
        setError(extractError(data) ?? '購入の開始に失敗しました。');
        return;
      }

      if ('url' in data && typeof data.url === 'string') {
        window.location.href = data.url;
        return;
      }

      // already_pro without url: just refresh
      window.location.reload();
    } finally {
      setLoading(null);
    }
  };

  const goPortal = async () => {
    setLoading('portal');
    setError(null);
    try {
      const r = await fetch('/api/billing/portal', { method: 'POST' });
      const data = (await r.json().catch(() => null)) as PortalResponse | null;
      if (!data || data.ok !== true) {
        setError(extractError(data) ?? '管理画面の作成に失敗しました。');
        return;
      }
      window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        {!isPro && (
          <button
            type="button"
            onClick={goCheckout}
            disabled={loading !== null}
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {loading === 'checkout' ? '購入画面へ…' : 'Proを購入する'}
          </button>
        )}

        <button
          type="button"
          onClick={goPortal}
          disabled={loading !== null}
          className="inline-flex items-center justify-center px-5 py-3 rounded-xl font-medium border border-gray-300 text-gray-900 hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          {loading === 'portal' ? '開いています…' : 'Proを管理する'}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
          {error}
        </div>
      )}
    </div>
  );
}

