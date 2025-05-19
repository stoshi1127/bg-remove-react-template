// import Image from "next/image"; // Removed unused import
// componentsフォルダからBgRemoverをインポート (パスは実際の構成に合わせてください)
import BgRemoverMulti from "../components/BgRemover"; // '@/components/...' は src ディレクトリがある場合
// import BgRemover from "../components/BgRemover"; // src ディレクトリがない場合など
// import type { Metadata } from 'next'; // 一時的にコメントアウト

const siteName = 'クイックカット';
// const description = '複数の画像を一度にアップロードして、背景を自動で透過できます。iPhoneで撮影した画像（HEIC/HEIF形式）も自動的に変換されます。無料で使えるオンライン背景透過ツールです。';
// const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'; // 一時的にコメントアウト

/* // 一時的にメタデータ全体をコメントアウト
export const metadata: Metadata = {
  title: `${siteName} - 簡単背景透過AIツール`,
  description: description,
  alternates: {
    canonical: '/', 
  },
  openGraph: {
    title: `${siteName} - 簡単背景透過AIツール`,
    description: description,
    siteName: siteName,
    images: [
      {
        url: '/ogp.png', 
        width: 1200,
        height: 630,
        alt: `${siteName} OGP画像`,
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteName} - 簡単背景透過AIツール`,
    description: description,
    images: ['/ogp.png'], 
  },
  icons: {
    icon: '/favicon.ico', 
    apple: '/apple-touch-icon.png',
  },
};
*/

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8"> {/* スタイルは適宜調整 */}
      {/* --- 元々あったコード (Next.jsロゴなど) は削除またはコメントアウト --- */}
      {/* <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        ... (元のコード) ...
      </div> */}

      {/* --- ここに背景除去コンポーネントを配置 --- */}
      <h1 className="text-4xl font-bold mb-8">{siteName}</h1>
      <p className="text-lg text-gray-600 mb-8 text-center max-w-2xl">
        複数の画像を一度にアップロードして、背景を自動で透過できます。
        iPhoneで撮影した画像（HEIC/HEIF形式）も自動的に変換されます。
      </p>
      <BgRemoverMulti />

      {/* --- 元々あったコード (Vercelロゴなど) は削除またはコメントアウト --- */}
      {/* <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:size-auto lg:bg-none">
        ... (元のコード) ...
      </div> */}
    </main>
  );
}