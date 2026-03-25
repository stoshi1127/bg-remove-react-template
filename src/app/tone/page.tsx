/**
 * EasyTone - 画像トーン調整ページ
 * https://bg.quicktools.jp/tone
 */

import type { Metadata } from 'next';

import EasyToneApp from '../../components/tone/EasyToneApp';

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bg.quicktools.jp';
  const pageUrl = `${siteUrl}/tone`;
  const title = '無料で写真の色味を調整できるオンラインツール | イージートーン';
  const description = '写真の色味をブラウザで無料調整できるオンラインツールです。商品写真やSNS画像の明るさ・色味をまとめて補正でき、インストール不要で複数画像の一括処理にも対応しています。';

  return {
    title,
    description,
    metadataBase: new URL(siteUrl),
    alternates: { canonical: '/tone' },
    keywords: [
      '写真 色味 調整',
      '色調補正',
      'トーン調整',
      '無料',
      'オンライン',
      'ブラウザ',
      '商品写真',
      'SNS画像',
      '画像編集',
      'イージートーン',
    ],
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'ja_JP',
      url: pageUrl,
      siteName: 'QuickTools',
      images: [
        { url: '/ogp-main.jpg', width: 1200, height: 630, alt: 'イージートーンの紹介画像' },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/ogp-main.jpg'],
    },
  };
}

export default function TonePage() {
  return <EasyToneApp />;
}
