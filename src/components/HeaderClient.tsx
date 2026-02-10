'use client';

import { useState } from 'react';
import Link from 'next/link';

type HeaderClientProps = {
  isLoggedIn: boolean;
};

export default function HeaderClient({ isLoggedIn }: HeaderClientProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => setIsMenuOpen(false);

  const ProLink = (
    <Link
      href="/?buyPro=1#pro"
      className="px-4 py-2 rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-semibold transition-colors duration-200 shadow-sm"
    >
      Proを購入
    </Link>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-soft">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* ロゴ */}
          <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity duration-200">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">QuickTools</span>
          </Link>

          {/* PC用ナビゲーション */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/"
              className="px-4 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-50 font-medium transition-colors duration-200"
            >
              イージーカット
            </Link>
            <Link
              href="/tone"
              className="px-4 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-50 font-medium transition-colors duration-200"
            >
              イージートーン
            </Link>
            <Link
              href="/trim"
              className="px-4 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-50 font-medium transition-colors duration-200"
            >
              イージートリミング
            </Link>

            <div className="w-px h-6 bg-gray-200 mx-1" aria-hidden="true" />

            {!isLoggedIn ? (
              <>
                {ProLink}
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-50 font-medium transition-colors duration-200"
                >
                  ログイン
                </Link>
              </>
            ) : (
              <Link
                href="/account"
                className="px-4 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-50 font-medium transition-colors duration-200"
              >
                アカウント
              </Link>
            )}

            {/* X公式アカウントリンク（アイコンのみ） */}
            <a
              href="https://x.com/QuickToolsJP"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors duration-200"
              aria-label="X公式アカウント"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </nav>

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
                  className="block px-4 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600"
                  onClick={closeMenu}
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
              <Link
                href="/account"
                className="block px-4 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-50 font-medium transition-colors duration-200"
                onClick={closeMenu}
              >
                アカウント
              </Link>
            )}

            {/* X公式アカウントリンク（スマホ版） */}
            <a
              href="https://x.com/QuickToolsJP"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors duration-200"
              onClick={closeMenu}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>公式X</span>
              </div>
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}

