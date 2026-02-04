'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const errorMessage = useMemo(() => {
    if (errorParam === 'expired') return 'リンクの有効期限が切れています。もう一度お試しください。';
    if (errorParam === 'invalid') return 'リンクが無効です。もう一度お試しください。';
    return null;
  }, [errorParam]);

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    try {
      const res = await fetch('/api/auth/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      // Privacy: Always show the same UX regardless of account existence.
      if (res.ok) {
        setStatus('sent');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {errorMessage ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-sm">
          {errorMessage}
        </div>
      ) : null}

      <label className="block">
        <span className="block text-sm font-medium text-gray-800 mb-2">メールアドレス</span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="you@example.com"
          disabled={status === 'sending' || status === 'sent'}
        />
      </label>

      <button
        type="submit"
        className="w-full inline-flex justify-center items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={status === 'sending' || status === 'sent'}
      >
        {status === 'sending' ? '送信中…' : 'ログインリンクを送信'}
      </button>

      {status === 'sent' ? (
        <div className="bg-green-50 border border-green-200 text-green-900 px-4 py-3 rounded-xl text-sm">
          メールを確認してください。ログインリンクを送信しました。
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-xl text-sm">
          送信に失敗しました。時間をおいて再度お試しください。
        </div>
      ) : null}
    </form>
  );
}

