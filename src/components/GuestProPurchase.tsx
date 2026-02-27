'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { trackAnalyticsEvent } from '@/lib/analytics/events';

type GuestCheckoutResponse =
  | { ok: true; url: string }
  | { ok: true; kind: 'already_pro' }
  | { ok: false; error: string };

type GuestProPurchaseProps = {
  /** 外部から開閉を制御する場合 */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export default function GuestProPurchase({ open: controlledOpen, onOpenChange }: GuestProPurchaseProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const autoOpenedRef = useRef(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    onOpenChange?.(v);
  };

  useEffect(() => {
    if (autoOpenedRef.current) return;
    const v = searchParams.get('buyPro');
    if (v === '1') {
      autoOpenedRef.current = true;
      setOpen(true);
    }
  }, [searchParams, setOpen]);

  const extractError = (v: unknown): string | null => {
    if (!v || typeof v !== 'object') return null;
    const rec = v as Record<string, unknown>;
    return typeof rec.error === 'string' ? rec.error : null;
  };

  const submit = async () => {
    if (loading) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/billing/guest-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => null)) as GuestCheckoutResponse | null;
      if (!data || data.ok !== true) {
        setMessage(extractError(data) ?? '購入の開始に失敗しました。');
        return;
      }
      if ('url' in data && typeof data.url === 'string') {
        trackAnalyticsEvent('checkout_started', { source: 'guest_modal' });
        window.location.href = data.url;
        return;
      }
      // already_pro
      setMessage('すでにProの可能性があります。必要ならログインして管理してください。');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenClick = () => {
    trackAnalyticsEvent('pro_purchase_click', { source: 'guest_cta' });
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpenClick}
        className="relative group w-full inline-flex items-center justify-center px-8 py-4 rounded-xl font-bold text-white overflow-hidden shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 bg-[length:200%_auto] animate-gradient-x group-hover:scale-105 transition-transform duration-500"></div>
        <div className="absolute inset-0 border-2 border-white/20 rounded-xl group-hover:border-white/40 transition-colors"></div>
        <span className="relative flex items-center gap-2 text-lg tracking-wide">
          Proを購入する
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => !loading && setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Proを購入する</h2>
                <p className="text-sm font-semibold text-amber-700 mt-1">月額780円</p>
                <p className="text-sm text-gray-600 mt-1">
                  広告なし・高精度・大きな画像・プレミアムAIが使えます。メールアドレスを入力して購入に進みます。購入後は自動でログインします。
                </p>
              </div>
              <button
                type="button"
                onClick={() => !loading && setOpen(false)}
                className="text-gray-400 hover:text-gray-700"
                aria-label="閉じる"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                メールアドレス
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com"
                  disabled={loading}
                />
              </label>

              {message && (
                <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  {message}
                </div>
              )}

              <button
                type="button"
                onClick={submit}
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-5 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 transition-colors disabled:opacity-60"
              >
                {loading ? '準備中…' : '購入手続きへ進む'}
              </button>

              <p className="text-xs text-gray-500 leading-relaxed">
                すでにProの方は、上部メニューの「ログイン」からアカウントにアクセスしてください。
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

