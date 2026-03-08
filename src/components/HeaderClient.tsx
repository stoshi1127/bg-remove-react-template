'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trackAnalyticsEvent } from '@/lib/analytics/events';
import PremiumUsageBadge from './PremiumUsageBadge';

type HeaderClientProps = {
  isLoggedIn: boolean;
  isPro?: boolean;
};

export default function HeaderClient({ isLoggedIn, isPro = false }: HeaderClientProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => setIsMenuOpen(false);

  const ProBadge = (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-yellow-500 shadow-sm"
      aria-label="Pro会員"
      title="Pro会員"
    >
      PRO
    </span>
  );

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* ロゴ */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="text-primary">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 4C25.7818 14.2173 33.7827 22.2182 44 24C33.7827 25.7818 25.7818 33.7827 24 44C22.2182 33.7827 14.2173 25.7818 4 24C14.2173 22.2182 22.2182 14.2173 24 4Z" fill="currentColor"></path>
              </svg>
            </div>
            <span className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
              QuickTools
            </span>
          </Link>

          {/* PC用ナビゲーション */}
          <nav className="hidden md:flex items-center gap-10">
            <Link
              href="/"
              className="text-sm font-bold text-primary relative after:content-[''] after:absolute after:bottom-[-8px] after:left-0 after:w-full after:h-1 after:bg-primary after:rounded-full"
            >
              イージーカット
            </Link>
            <Link
              href="/tone"
              className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-primary transition-colors"
            >
              イージートーン
            </Link>
            <Link
              href="/trim"
              className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-primary transition-colors"
            >
              イージートリミング
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {!isLoggedIn ? (
              <>
                <Link
                  href="/?buyPro=1#pro"
                  onClick={() => trackAnalyticsEvent('pro_purchase_click', { source: 'header' })}
                  className="bg-pro-orange hover:bg-orange-600 text-white px-6 py-2.5 rounded-full text-sm font-extrabold transition-all shadow-md shadow-orange-200"
                >
                  Pro版を購入
                </Link>
                <Link
                  href="/login"
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white px-6 py-2.5 rounded-full text-sm font-extrabold transition-all"
                >
                  ログイン
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                {isPro ? (
                  <>
                    <PremiumUsageBadge isPro={isPro} />
                    {ProBadge}
                  </>
                ) : null}
                <Link
                  href="/account"
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white px-6 py-2.5 rounded-full text-sm font-extrabold transition-all"
                >
                  アカウント
                </Link>
              </div>
            )}
          </div>



          {/* スマホ用ハンバーガーメニューボタン */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              aria-expanded={isMenuOpen}
              aria-label="メニューを開く"
            >
              <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                <span
                  className={`block w-6 h-0.5 bg-gray-600 transition-all duration-200 ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}
                ></span>
                <span
                  className={`block w-6 h-0.5 bg-gray-600 transition-all duration-200 ${isMenuOpen ? 'opacity-0' : ''}`}
                ></span>
                <span
                  className={`block w-6 h-0.5 bg-gray-600 transition-all duration-200 ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}
                ></span>
              </div>
            </button>
          </div>
        </div>

        {/* スマホ用ドロップダウンメニュー */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-200 ease-out ${isMenuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <nav className="pt-4 pb-2 space-y-1">
            <Link
              href="/"
              className="block px-4 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-50 font-medium transition-colors duration-200"
              onClick={closeMenu}
            >
              イージーカット
            </Link>
            <Link
              href="/tone"
              className="block px-4 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-50 font-medium transition-colors duration-200"
              onClick={closeMenu}
            >
              イージートーン
            </Link>
            <Link
              href="/trim"
              className="block px-4 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-50 font-medium transition-colors duration-200"
              onClick={closeMenu}
            >
              イージートリミング
            </Link>

            <div className="h-px bg-gray-200 my-2" aria-hidden="true" />

            {!isLoggedIn ? (
              <>
                <Link
                  href="/?buyPro=1#pro"
                  className="block px-4 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
                  onClick={() => {
                    trackAnalyticsEvent('pro_purchase_click', { source: 'header_mobile' });
                    closeMenu();
                  }}
                >
                  Proを購入
                </Link>
                <Link
                  href="/login"
                  className="block px-4 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-50 font-medium transition-colors duration-200"
                  onClick={closeMenu}
                >
                  ログイン
                </Link>
              </>
            ) : (
              <div className="px-4 py-2 space-y-2" onClick={closeMenu}>
                <div className="flex items-center justify-between">
                  <Link
                    href="/account"
                    className="rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-50 font-medium transition-colors duration-200 px-2 py-2 -mx-2"
                  >
                    アカウント
                  </Link>
                  {isPro ? ProBadge : null}
                </div>
                {isPro ? (
                  <PremiumUsageBadge isPro={isPro} className="block w-fit" />
                ) : null}
              </div>
            )}
          </nav>

        </div>
      </div>
    </header>
  );
}

