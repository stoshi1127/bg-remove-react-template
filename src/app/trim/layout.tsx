import type { Metadata } from 'next';

const siteName = 'イージートリミング';
const description = 'イージートリミングは、画像をかんたん・高精度にトリミングできる無料オンラインツールです。SNSアイコンやヘッダー、メルカリ・Instagram用など多彩な比率プリセットに対応。HEIC/HEIF画像も自動変換。QuickToolsブランドのトリミングアプリ。';

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bg.quicktools.jp';
  return {
    title: `${siteName} | 無料AI画像トリミング・比率調整ツール`,
    description: '画像を高精度にトリミングできる無料オンラインツール。SNSアイコン、Xヘッダー、Instagram投稿用など多彩な比率プリセット対応。iPhone HEIC画像も自動変換。登録不要・商用利用OK。',
    keywords: '画像トリミング,画像切り抜き,画像編集,SNSアイコン,Instagram,比率調整,HEIC変換,トリミング,無料,iPhone,写真加工,画像処理,メルカリ',
    metadataBase: new URL(siteUrl),
    alternates: { 
      canonical: '/trim',
    },
    robots: 'index,follow',
    openGraph: {
      title: `${siteName} | 無料AI画像トリミング・比率調整ツール`,
      description: '画像を高精度にトリミングできる無料オンラインツール。SNSアイコン、Xヘッダー、Instagram投稿用など多彩な比率プリセット対応。',
      url: `${siteUrl}/trim`,
      siteName: 'QuickTools',
      images: [
        { url: '/ogp-trim.png', width: 1200, height: 630, alt: `${siteName} OGP画像` },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${siteName} | 無料AI画像トリミング・比率調整ツール`,
      description: '画像を高精度にトリミングできる無料オンラインツール。SNSアイコン、Xヘッダー、Instagram投稿用など多彩な比率プリセット対応。',
      images: ['/ogp-trim.png'],
    },
    other: {
      'google-site-verification': '-SgV6VIRvfRUUP3Qp7ejZw4HCjo8hRLeis0upVAPsSU'
    }
  };
}

export default function TrimLayout({ children }: { children: React.ReactNode }) {
  return children;
} 