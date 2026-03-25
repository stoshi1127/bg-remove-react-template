// "use client";
import './globals.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import Script from 'next/script';
import Link from 'next/link';
import Header from '../components/Header';
import BrandIcon from '../components/BrandIcon';

const inter = Inter({ subsets: ['latin'] });
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bg.quicktools.jp';

export const metadata: Metadata = {
  title: 'イージーカット | 無料AI背景透過・画像編集ツール',
  description: '複数画像の一括背景透過、HEIC変換、画像トリミングが無料で使える日本語AIツール。iPhone画像対応、高精度AI処理、商用利用OK。背景除去・画像編集・写真加工ならイージーカット',
  keywords: '背景透過,背景除去,画像編集,HEIC変換,トリミング,AI,無料,iPhone,写真加工,画像処理,背景削除,透明化',
  metadataBase: new URL(siteUrl),
  verification: {
    google: '-SgV6VIRvfRUUP3Qp7ejZw4HCjo8hRLeis0upVAPsSU',
  },
  robots: 'index,follow',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
    ],
    apple: [
      { url: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  },
  // OGPメタデータは各ページで個別に設定
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="scroll-smooth">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
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

      {/* 構造化データ: Organization */}
      <Script id="organization-structured-data" type="application/ld+json" strategy="afterInteractive">
        {`
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "QuickTools",
            "url": "https://bg.quicktools.jp",
            "logo": "https://bg.quicktools.jp/icon.svg",
            "description": "無料AI画像編集ツール。背景透過・HEIC変換・画像トリミングがすべて無料でご利用いただけます。",
            "sameAs": [],
            "contactPoint": {
              "@type": "ContactPoint",
              "contactType": "customer service",
              "availableLanguage": "Japanese"
            },
            "foundingDate": "2025",
            "areaServed": "JP",
            "serviceType": [
              "背景透過",
              "画像編集", 
              "HEIC変換",
              "画像トリミング"
            ]
          }
        `}
      </Script>
      <body className={`${inter.className} bg-gray-50`}>
        <Header />

        <main className="min-h-screen">
          {children}
        </main>

        <footer className="bg-gray-900 text-white">
          <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div className="md:col-span-2">
                <div className="flex items-center space-x-3 mb-4">
                  <BrandIcon size={32} className="shadow-[0_10px_24px_rgba(14,165,233,0.3)]" roundedClassName="rounded-xl" />
                  <span className="text-xl font-bold text-white">
                    QuickTools
                  </span>
                </div>
                <p className="text-gray-300 leading-relaxed max-w-md">
                  無料AI画像編集ツール。背景透過・HEIC変換・画像トリミングがすべて無料でご利用いただけます。
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 text-white">ツール</h3>
                <div className="space-y-2">
                  <Link href="/" className="block text-gray-300 hover:text-white transition-colors duration-200">
                    イージーカット
                  </Link>
                  <Link href="/tone" className="block text-gray-300 hover:text-white transition-colors duration-200">
                    イージートーン
                  </Link>
                  <Link href="/trim" className="block text-gray-300 hover:text-white transition-colors duration-200">
                    イージートリミング
                  </Link>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 text-white">その他</h3>
                <div className="space-y-2">
                  <Link href="/#pro" className="block text-gray-300 hover:text-white transition-colors duration-200">
                    料金・プラン
                  </Link>
                  <Link href="/terms" className="block text-gray-300 hover:text-white transition-colors duration-200">
                    利用規約
                  </Link>
                  <Link href="/legal/tokushoho" className="block text-gray-300 hover:text-white transition-colors duration-200">
                    特定商取引法に基づく表記
                  </Link>
                  <Link href="/privacy-policy" className="block text-gray-300 hover:text-white transition-colors duration-200">
                    プライバシーポリシー
                  </Link>
                  <Link href="/login" className="block text-gray-300 hover:text-white transition-colors duration-200">
                    ログイン
                  </Link>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-6">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                <div className="flex flex-col md:flex-row items-center md:space-x-4 space-y-2 md:space-y-0">
                  <p className="text-sm text-gray-400">
                    無料AI画像編集ツール | 背景透過・HEIC変換・画像トリミング
                  </p>
                  <a
                    href="https://x.com/QuickToolsJP"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors duration-200"
                    aria-label="X公式アカウント"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                </div>
                <p className="text-sm text-gray-400">
                  © 2025 QuickTools. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
