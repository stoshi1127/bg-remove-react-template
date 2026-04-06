'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    setLoading(true);
    try {
      await signOut({ callbackUrl: '/login' });
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-red-100 bg-red-50/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-red-900">ログアウト</div>
          <p className="text-sm text-red-700">この端末のログインを終了します</p>
        </div>
        <button
          type="button"
          onClick={logout}
          disabled={loading}
          className="inline-flex items-center justify-center px-5 py-3 border border-red-200 rounded-xl text-red-700 font-semibold bg-white hover:bg-red-50 transition-colors disabled:opacity-60"
        >
          {loading ? 'ログアウト中…' : 'ログアウト'}
        </button>
      </div>
    </div>
  );
}
