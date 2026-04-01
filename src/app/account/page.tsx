import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { getStripeMode } from '@/lib/billing/stripeMode';
import { isBillingEnabled } from '@/lib/billing/config';
import LogoutButton from './ui/LogoutButton';
import BillingButtons from './ui/BillingButtons';
import BillingTracking from './ui/BillingTracking';
import AccountPremiumUsage from './ui/AccountPremiumUsage';

export const metadata: Metadata = {
  title: 'アカウント | QuickTools',
  description: 'QuickToolsアカウント情報',
  robots: { index: false, follow: false },
};

function formatJstDate(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const stripeMode = getStripeMode();
  const billingEnabled = isBillingEnabled();
  const subscription = await prisma.stripeSubscription.findFirst({
    where: { userId: user.id, stripeMode },
    orderBy: { updatedAt: 'desc' },
  });

  const showPaymentWarning =
    subscription?.status === 'past_due' || subscription?.status === 'unpaid';
  const showCancelAtPeriodEnd =
    subscription?.cancelAtPeriodEnd === true &&
    subscription?.status !== 'canceled' &&
    subscription?.status !== 'incomplete_expired';

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Suspense fallback={null}>
        <BillingTracking />
      </Suspense>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">アカウント</h1>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-soft">
        <div className="space-y-2">
          <div className="text-sm text-gray-500">ログイン中</div>
          <div className="text-lg font-semibold text-gray-900">{user.email}</div>
        </div>

        <div className="mt-6 border-t border-gray-100 pt-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-gray-500">プラン</div>
              <div className="text-lg font-semibold text-gray-900">
                {user.isPro ? 'Pro' : 'Free'}
                {user.isPro && (
                  <span className="ml-2 text-sm font-normal text-gray-600">（月額780円）</span>
                )}
              </div>
              {user.proValidUntil && (
                <div className="text-xs text-gray-500 mt-1">
                  Pro有効期限（暫定）: {formatJstDate(user.proValidUntil)}
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {stripeMode === 'live' ? '本番' : 'テスト'}モード
            </div>
          </div>

          {showPaymentWarning && (
            <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-4">
              お支払いに問題がある可能性があります（ステータス: {subscription.status}）。
              current period end まではProを維持しますが、早めに「Proを管理する」からお支払い方法をご確認ください。
            </div>
          )}

          {showCancelAtPeriodEnd && (
            <div className="text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-xl p-4">
              Proは解約予約中です。
              {subscription?.currentPeriodEnd
                ? ` 現在の利用期間終了までは引き続き利用でき、終了予定日は ${formatJstDate(subscription.currentPeriodEnd)} です。`
                : ' 現在の利用期間終了までは引き続き利用できます。終了予定日の反映に少し時間がかかる場合があります。'}
            </div>
          )}

          {user.isPro && (
            <div className="mt-4">
              <AccountPremiumUsage isPro={user.isPro} />
            </div>
          )}

          {billingEnabled ? (
            <BillingButtons isPro={user.isPro} />
          ) : (
            <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl p-4">
              現在、課金機能は一時停止中です。
            </div>
          )}
        </div>

        <div className="mt-6">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
