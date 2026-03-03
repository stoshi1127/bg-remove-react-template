'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { signIn } from 'next-auth/react';
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
  const setOpen = useCallback((v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    onOpenChange?.(v);
  }, [isControlled, onOpenChange]);

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
        className="w-full inline-flex items-center justify-center px-6 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-base"
      >
        Proを購入する
      </button>

      {open && typeof document !== 'undefined'
        ? createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
            <div
              className="fixed inset-0 bg-black/40"
              onClick={() => !loading && setOpen(false)}
              aria-hidden="true"
            />
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-6 z-10">
              <button
                type="button"
                onClick={() => !loading && setOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-2 transition-colors z-20"
                aria-label="閉じる"
              >
                <span className="text-2xl leading-none">×</span>
              </button>

              <div className="flex flex-col items-center gap-1 mb-4">
                <h2 className="text-lg font-bold text-gray-900">Proを購入する</h2>
                <p className="text-3xl font-semibold text-amber-700 my-1">月額780円</p>
                <p className="text-sm text-gray-600 text-center">
                  広告なし・高精度・大きな画像・プレミアムAIが使えます。メールアドレスを入力して購入に進みます。
                </p>
              </div>

              <div className="mt-5 space-y-4">
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    signIn('google', { callbackUrl: '/api/billing/checkout' });
                  }}
                  disabled={loading}
                  className="w-full inline-flex justify-center items-center px-5 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Googleアカウントで登録・購入
                </button>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white text-gray-500">またはメールアドレスで購入</span>
                  </div>
                </div>

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
          </div>,
          document.body
        )
        : null}
    </>
  );
}

