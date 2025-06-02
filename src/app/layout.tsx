// "use client";
import './globals.css';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import Link from 'next/link';
import Header from '../components/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'イージーカット | 無料AI背景透過・画像編集ツール',
  description: '複数画像の一括背景透過、HEIC変換、画像トリミングが無料で使える日本語AIツール。iPhone画像対応、高精度AI処理、商用利用OK。背景除去・画像編集・写真加工ならイージーカット',
  keywords: '背景透過,背景除去,画像編集,HEIC変換,トリミング,AI,無料,iPhone,写真加工,画像処理,背景削除,透明化',
  verification: {
    google: '-SgV6VIRvfRUUP3Qp7ejZw4HCjo8hRLeis0upVAPsSU',
  },
  robots: 'index,follow',
  language: 'ja',
  other: {
    'google-site-verification': '-SgV6VIRvfRUUP3Qp7ejZw4HCjo8hRLeis0upVAPsSU'
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="scroll-smooth">
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
      <body className={`${inter.className} bg-gray-50`}>
        <Header />

        <main className="pt-20 min-h-screen">
          {children}
        </main>

        <footer className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent"></div>
          <div className="absolute top-0 left-1/2 w-96 h-96 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
          
          <div className="relative z-10 p-8">
            <div className="container mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                <div className="md:col-span-2">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                      </svg>
                    </div>
                    <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      QuickTools
                    </span>
                  </div>
                  <p className="text-gray-300 text-lg leading-relaxed max-w-md">
                    無料AI画像編集ツール。背景透過・HEIC変換・画像トリミングがすべて無料でご利用いただけます。
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-white">ツール</h3>
                  <div className="space-y-3">
                    <Link href="/" className="block text-gray-300 hover:text-white transition-colors duration-300 hover:translate-x-1 transform">
                      イージーカット
                    </Link>
                    <Link href="/trim" className="block text-gray-300 hover:text-white transition-colors duration-300 hover:translate-x-1 transform">
                      イージートリミング
                    </Link>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-white">その他</h3>
                  <div className="space-y-3">
                    <Link href="/blog" className="block text-gray-300 hover:text-white transition-colors duration-300 hover:translate-x-1 transform">
                      ブログ
                    </Link>
                    <Link href="/privacy-policy" className="block text-gray-300 hover:text-white transition-colors duration-300 hover:translate-x-1 transform">
                      プライバシーポリシー
                    </Link>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-700/50 pt-6">
                <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                  <p className="text-sm text-gray-400">
                    無料AI画像編集ツール | 背景透過・HEIC変換・画像トリミング
                  </p>
                  <p className="text-sm text-gray-400">
                    © 2025 QuickTools. All rights reserved.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
