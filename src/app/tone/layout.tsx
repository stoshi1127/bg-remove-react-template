/**
 * EasyTone専用レイアウト
 */

import { ReactNode } from 'react';
import Script from 'next/script';

interface ToneLayoutProps {
  children: ReactNode;
}

export default function ToneLayout({ children }: ToneLayoutProps) {
  return (
    <>
      {/* EasyTone専用の構造化データ */}
      <Script id="easytone-structured-data" type="application/ld+json" strategy="afterInteractive">
        {`
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "イージートーン",
            "alternateName": "イージートーン - かんたん色調整（色調補正）",
            "description": "3ステップで写真の色味を整えます。複数の写真を一括処理できる無料のオンライン画像編集ツール。色調整（色調補正）に対応。",
            "url": "https://bg.quicktools.jp/tone",
            "applicationCategory": "MultimediaApplication",
            "operatingSystem": "Web Browser",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "JPY"
            },
            "author": {
              "@type": "Organization",
              "name": "QuickTools",
              "url": "https://bg.quicktools.jp"
            },
            "publisher": {
              "@type": "Organization",
              "name": "QuickTools",
              "url": "https://bg.quicktools.jp"
            },
            "featureList": [
              "画像の色調整（色調補正）",
              "複数画像一括処理",
              "プリセットフィルター",
              "リアルタイムプレビュー",
              "高品質出力",
              "レスポンシブデザイン"
            ],
            "softwareHelp": {
              "@type": "CreativeWork",
              "url": "https://bg.quicktools.jp/tone#help"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "ratingCount": "1250"
            }
          }
        `}
      </Script>
      
      {children}
    </>
  );
}