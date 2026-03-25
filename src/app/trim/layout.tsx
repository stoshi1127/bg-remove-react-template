import type { Metadata } from 'next';

const siteName = 'イージートリミング';
const description = '画像をブラウザで無料トリミングできるオンラインツールです。SNSアイコンやヘッダー、メルカリ・Instagram用の比率プリセットに対応し、HEIC/HEIF画像も自動変換できます。';

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bg.quicktools.jp';
  const pageUrl = `${siteUrl}/trim`;
  const title = `無料で画像をトリミングできるオンラインツール | ${siteName}`;

  return {
    title,
    description,
    metadataBase: new URL(siteUrl),
    alternates: { canonical: '/trim' },
    keywords: [
      '画像トリミング',
      '無料',
      'オンライン',
      'ブラウザ',
      'HEIC',
      '画像切り抜き',
      'SNSアイコン',
      'メルカリ',
      'Instagram',
      'QuickTools',
    ],
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: 'QuickTools',
      locale: 'ja_JP',
      images: [
        { url: '/ogp.png?v=202501', width: 1200, height: 630, alt: `${siteName}の紹介画像` },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/ogp.png?v=202501'],
    },
  };
}

export default function TrimLayout({ children }: { children: React.ReactNode }) {
  return children;
} 
