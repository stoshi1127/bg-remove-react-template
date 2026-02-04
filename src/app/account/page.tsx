import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth/session';
import LogoutButton from './ui/LogoutButton';

export const metadata: Metadata = {
  title: 'アカウント | QuickTools',
  description: 'QuickToolsアカウント情報',
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">アカウント</h1>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-soft">
        <div className="space-y-2">
          <div className="text-sm text-gray-500">ログイン中</div>
          <div className="text-lg font-semibold text-gray-900">{user.email}</div>
        </div>

        <div className="mt-6">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}

