import './globals.css';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import Link from 'next/link';
import { useState } from 'react';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'QuickTools',
  description: 'Online background removal tool using AI',
  verification: {
    google: '-SgV6VIRvfRUUP3Qp7ejZw4HCjo8hRLeis0upVAPsSU',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <html lang="ja">
      <Script
        strategy="afterInteractive"
        src="https://www.googletagmanager.com/gtag/js?id=G-YT0ZDBKL81"
      />
      <Script id="google-analytics-config" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-YT0ZDBKL81');
        `}
      </Script>
      <body className={inter.className}>
        <header className="bg-gray-800 text-white p-4 shadow-md">
          <div className="container mx-auto flex justify-between items-center">
            <Link href="/" className="text-xl font-bold">
              QuickTools
            </Link>

            <nav className="hidden md:flex space-x-4">
              <Link href="/" className="hover:underline">
                イージーカット
              </Link>
              <Link href="/trim" className="hover:underline">
                イージートリミング
              </Link>
            </nav>

            <div className="md:hidden">
              <button onClick={toggleMenu} className="text-white focus:outline-none">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              </button>
            </div>
          </div>

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

        <main className="flex-grow">
          {children}
        </main>

        <footer className="bg-gray-800 text-white p-4 mt-8 text-center">
          <div className="container mx-auto">
            <div className="flex justify-center space-x-4 mb-2">
              <Link href="/" className="hover:underline">
                トップ
              </Link>
              <Link href="/" className="hover:underline">
                イージーカット
              </Link>
              <Link href="/trim" className="hover:underline">
                イージートリミング
              </Link>
              <Link href="/privacy-policy" className="hover:underline">
                プライバシーポリシー
              </Link>
            </div>
            <p>© 2025 QuickTools. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
