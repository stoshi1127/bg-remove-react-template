import type { Metadata } from 'next';

const siteName = 'イージートリミング';
const description = 'イージートリミングは、画像をかんたん・高精度にトリミングできる無料オンラインツールです。SNSアイコンやヘッダー、メルカリ・Instagram用など多彩な比率プリセットに対応。HEIC/HEIF画像も自動変換。QuickToolsブランドのトリミングアプリ。';

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000/trim';
  return {
    title: `${siteName} - かんたん画像トリミングAIツール` ,
    description,
    metadataBase: new URL(siteUrl),
    alternates: { canonical: '/trim' },
    openGraph: {
      title: `${siteName} - かんたん画像トリミングAIツール`,
      description,
      url: siteUrl,
      siteName: 'QuickTools',
      images: [
        { url: '/ogp-trim.png', width: 1200, height: 630, alt: `${siteName} OGP画像` },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${siteName} - かんたん画像トリミングAIツール`,
      description,
      images: ['/ogp-trim.png'],
    },
  };
}

export default function TrimLayout({ children }: { children: React.ReactNode }) {
  return children;
} 