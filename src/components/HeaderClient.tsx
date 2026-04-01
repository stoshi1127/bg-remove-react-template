'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { trackAnalyticsEvent } from '@/lib/analytics/events';
import BrandIcon from './BrandIcon';
import PremiumUsageBadge from './PremiumUsageBadge';

type HeaderClientProps = {
  isLoggedIn: boolean;
  isPro?: boolean;
  billingEnabled?: boolean;
};

export default function HeaderClient({ isLoggedIn, isPro = false, billingEnabled = true }: HeaderClientProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => setIsMenuOpen(false);

  // リンクがアクティブかどうかを判定する関数
  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname?.startsWith(path);
  };

  const linkClass = (path: string) => {
    const active = isActive(path);
    const base = "text-sm transition-colors relative whitespace-nowrap";
    if (active) {
      return `${base} font-bold text-primary after:content-[''] after:absolute after:bottom-[-8px] after:left-0 after:w-full after:h-1 after:bg-primary after:rounded-full`;
    }
    return `${base} font-semibold text-slate-500 hover:text-primary`;
  };

  const mobileLinkClass = (path: string) => {
    const active = isActive(path);
    const base = "block px-4 py-2 rounded-lg font-medium transition-colors duration-200";
    if (active) {
      return `${base} text-primary bg-blue-50`;
    }
    return `${base} text-gray-700 hover:text-primary hover:bg-gray-50`;
  };

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
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 lg:h-20">
          {/* ロゴ */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 hover:opacity-80 transition-opacity min-w-0">
            <BrandIcon size={40} className="" />
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400 whitespace-nowrap">
              QuickTools
            </span>
          </Link>

          {/* PC用ナビゲーション */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-10">
            <Link href="/" className={linkClass("/")}>
              イージーカット
            </Link>
            <Link href="/tone" className={linkClass("/tone")}>
              イージートーン
            </Link>
            <Link href="/trim" className={linkClass("/trim")}>
              イージートリミング
            </Link>
          </nav>

          <div className="hidden lg:flex items-center gap-3 xl:gap-4">
            {!isLoggedIn ? (
              <>
                {billingEnabled ? (
                  <Link
                    href="/?buyPro=1#pro"
                    onClick={() => trackAnalyticsEvent('pro_purchase_click', { source: 'header' })}
                    className="bg-pro-orange hover:bg-orange-600 text-white px-5 xl:px-6 py-2.5 rounded-full text-sm font-extrabold transition-all shadow-md shadow-orange-200 whitespace-nowrap"
                  >
                    Proを購入する
                  </Link>
                ) : null}
                <Link
                  href="/login"
                  className="bg-slate-100 hover:bg-slate-200 text-slate-900 px-5 xl:px-6 py-2.5 rounded-full text-sm font-extrabold transition-all whitespace-nowrap"
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
                  className="bg-slate-100 hover:bg-slate-200 text-slate-900 px-5 xl:px-6 py-2.5 rounded-full text-sm font-extrabold transition-all whitespace-nowrap"
                >
                  アカウント
                </Link>
              </div>
            )}
          </div>



          {/* スマホ用ハンバーガーメニューボタン */}
          <div className="lg:hidden">
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
          className={`lg:hidden overflow-hidden transition-all duration-200 ease-out ${isMenuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <nav className="pt-4 pb-2 space-y-1">
            <Link
              href="/"
              className={mobileLinkClass("/")}
              onClick={closeMenu}
            >
              イージーカット
            </Link>
            <Link
              href="/tone"
              className={mobileLinkClass("/tone")}
              onClick={closeMenu}
            >
              イージートーン
            </Link>
            <Link
              href="/trim"
              className={mobileLinkClass("/trim")}
              onClick={closeMenu}
            >
              イージートリミング
            </Link>

            <div className="h-px bg-gray-200 my-2" aria-hidden="true" />

            {!isLoggedIn ? (
              <>
                {billingEnabled ? (
                  <Link
                    href="/?buyPro=1#pro"
                    className="block px-4 py-2 rounded-lg font-semibold text-white bg-pro-orange hover:bg-orange-600"
                    onClick={() => {
                      trackAnalyticsEvent('pro_purchase_click', { source: 'header_mobile' });
                      closeMenu();
                    }}
                  >
                    Proを購入する
                  </Link>
                ) : null}
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
