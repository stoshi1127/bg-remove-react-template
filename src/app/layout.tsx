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
        <Header />

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
              <Link href="/blog" className="hover:underline">
                ブログ
              </Link>
              <Link href="/privacy-policy" className="hover:underline">
                プライバシーポリシー
              </Link>
            </div>
            <p className="text-sm text-gray-400 mb-2">
              無料AI画像編集ツール | 背景透過・HEIC変換・画像トリミング
            </p>
            <p>© 2025 QuickTools. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
