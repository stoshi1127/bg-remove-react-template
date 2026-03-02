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
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className="inline-flex items-center px-5 py-3 border border-gray-300 rounded-xl text-gray-800 font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
    >
      {loading ? 'ログアウト中…' : 'ログアウト'}
    </button>
  );
}

