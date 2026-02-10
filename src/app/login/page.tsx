import type { Metadata } from 'next';
import Link from 'next/link';

import LoginForm from './ui/LoginForm';

export const metadata: Metadata = {
  title: 'ログイン | QuickTools',
  description: 'QuickTools（イージーカット）にログインします。',
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  // Next.js (15+) types this as Promise in generated PageProps
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const error =
    typeof resolved?.error === 'string'
      ? resolved.error
      : Array.isArray(resolved?.error)
        ? resolved?.error[0]
        : undefined;

  return (
    <div className="container mx-auto px-4 py-12 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">ログイン</h1>
      <p className="text-gray-600 mb-8">
        メールアドレスにログインリンクを送信します。パスワードは不要です。
      </p>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-soft">
        <LoginForm error={error} />
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <p className="text-sm text-gray-700 leading-relaxed">
          ログインできるのは <span className="font-semibold">Pro購入済み（会員）</span> の方のみです。
          まだProを購入していない場合は、先に購入手続きへ進んでください。
        </p>
        <div className="mt-3">
          <Link
            href="/?buyPro=1#pro"
            className="inline-flex items-center px-5 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-colors"
          >
            Proを購入する
          </Link>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-6 leading-relaxed">
        送信されたリンクは一定時間で無効になります。心当たりがない場合は破棄してください。
      </p>
    </div>
  );
}

