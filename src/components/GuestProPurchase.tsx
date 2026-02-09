'use client';

import { useState } from 'react';

type GuestCheckoutResponse =
  | { ok: true; url: string }
  | { ok: true; kind: 'already_pro' }
  | { ok: false; error: string };

export default function GuestProPurchase() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
        window.location.href = data.url;
        return;
      }
      // already_pro
      setMessage('すでにProの可能性があります。必要ならログインして管理してください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center px-5 py-3 rounded-xl font-semibold bg-gray-900 text-white hover:bg-black transition-colors"
      >
        Proを購入する
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !loading && setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Proを購入する</h2>
                <p className="text-sm text-gray-600 mt-1">
                  メールアドレスを入力して購入に進みます。購入後は自動でログインします。
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
                className="w-full inline-flex items-center justify-center px-5 py-3 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {loading ? '起動中…' : 'Checkoutへ進む'}
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

