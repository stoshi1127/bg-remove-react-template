import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import QuickToolsHeader from "../components/QuickToolsHeader";
import QuickToolsFooter from "../components/QuickToolsFooter";

const inter = Inter({
  variable: "--qt-font-family-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--qt-font-family-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EasyTone - 簡単画像トーン調整 | QuickTools",
    template: "%s | EasyTone - QuickTools"
  },
  description: "3ステップで簡単に画像にプロのようなトーンを適用。複数の写真を一括処理できる無料のオンライン画像編集ツール。商品写真、SNS投稿、ブログ記事に最適。",
  keywords: [
    "画像処理", "フィルター", "トーン調整", "写真編集", "画像フィルター",
    "一括処理", "商品写真", "SNS", "ブログ", "無料", "オンライン",
    "QuickTools", "EasyTone", "画像編集", "写真加工"
  ],
  authors: [{ name: "QuickTools", url: "https://quicktools.app" }],
  creator: "QuickTools",
  publisher: "QuickTools",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  metadataBase: new URL('https://quicktools.app'),
  alternates: {
    canonical: '/tone',
  },
  openGraph: {
    title: "EasyTone - 簡単画像トーン調整 | QuickTools",
    description: "3ステップで簡単に画像にプロのようなトーンを適用。複数の写真を一括処理できる無料のオンライン画像編集ツール。",
    type: "website",
    locale: "ja_JP",
    url: "https://quicktools.app/tone",
    siteName: "QuickTools",
    images: [
      {
        url: "/tone/og-image.png",
        width: 1200,
        height: 630,
        alt: "EasyTone - 簡単画像トーン調整ツール",
        type: "image/png",
      },
      {
        url: "/tone/og-image-square.png",
        width: 1200,
        height: 1200,
        alt: "EasyTone - 簡単画像トーン調整ツール",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@QuickTools",
    creator: "@QuickTools",
    title: "EasyTone - 簡単画像トーン調整 | QuickTools",
    description: "3ステップで簡単に画像にプロのようなトーンを適用。複数の写真を一括処理できる無料のオンライン画像編集ツール。",
    images: [
      {
        url: "/tone/twitter-image.png",
        width: 1200,
        height: 630,
        alt: "EasyTone - 簡単画像トーン調整ツール",
      },
    ],
  },
  verification: {
    google: "your-google-verification-code",
    yandex: "your-yandex-verification-code",
    yahoo: "your-yahoo-verification-code",
  },
  category: "technology",
  classification: "画像編集ツール",
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'EasyTone',
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#2563eb',
    'msapplication-config': '/tone/browserconfig.xml',
    'theme-color': '#2563eb',
    'format-detection': 'telephone=no',
    'HandheldFriendly': 'true',
    'MobileOptimized': '320',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="manifest" href="/tone/manifest.json" />
        <link rel="apple-touch-icon" sizes="180x180" href="/tone/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/tone/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/tone/favicon-16x16.png" />
        <link rel="mask-icon" href="/tone/safari-pinned-tab.svg" color="#2563eb" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <QuickToolsHeader currentTool="EasyTone" />
        <main style={{ flex: 1 }}>
          {children}
        </main>
        <QuickToolsFooter />
      </body>
    </html>
  );
}
