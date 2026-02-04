'use client';

import { useState } from 'react';

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
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

