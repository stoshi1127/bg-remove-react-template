"use client";
import { useState } from 'react';
import Link from 'next/link';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="bg-gray-800 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          QuickTools
        </Link>

        {/* PC用ナビゲーション */}
        <nav className="hidden md:flex space-x-4">
          <Link href="/" className="hover:underline">
            イージーカット
          </Link>
          <Link href="/trim" className="hover:underline">
            イージートリミング
          </Link>
        </nav>

        {/* スマホ用ハンバーガーメニューボタン */}
        <div className="md:hidden">
          <button onClick={toggleMenu} className="text-white focus:outline-none">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* スマホ用ドロップダウンメニュー */}
      {isMenuOpen && (
        <div className="md:hidden bg-gray-700 mt-2 space-y-2 p-4">
          <Link href="/" className="block text-white hover:underline" onClick={toggleMenu}>
            イージーカット
          </Link>
          <Link href="/trim" className="block text-white hover:underline" onClick={toggleMenu}>
            イージートリミング
          </Link>
        </div>
      )}
    </header>
  );
} 