// import Image from "next/image"; // Removed unused import
// componentsフォルダからBgRemoverをインポート (パスは実際の構成に合わせてください)
import BgRemoverMulti from "../components/BgRemover"; // '@/components/...' は src ディレクトリがある場合
// import BgRemover from "../components/BgRemover"; // src ディレクトリがない場合など
import type { Metadata } from 'next'; // コメントアウト解除

const siteName = 'クイックカット';
const description = '複数の画像を一度にアップロードして、背景を自動で透過できます。iPhoneで撮影した画像（HEIC/HEIF形式）も自動的に変換されます。無料で使えるオンライン背景透過ツールです。'; // コメントアウト解除

// メタデータ定義を generateMetadata 関数を使用して動的に生成
export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'; // コメントアウト解除

  return {
    title: `${siteName} - 簡単背景透過AIツール`,
    description: description,
    metadataBase: new URL(siteUrl), // 有効化
    alternates: {
      canonical: '/', // metadataBaseがあるので絶対パスになる
    },
    openGraph: {
      title: `${siteName} - 簡単背景透過AIツール`,
      description: description,
      url: siteUrl, // 有効化
      siteName: siteName,
      images: [
        {
          url: '/ogp.png', // metadataBaseからの相対パス
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
      images: ['/ogp.png'], // metadataBaseからの相対パス
      // site: '@yourtwitterhandle', 
      // creator: '@yourtwitterhandle', 
    },
    // icons は layout.tsx で設定するためここでは不要
    // viewport: 'width=device-width, initial-scale=1', // Next.jsが自動で設定
  };
}

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

      {/* --- ここに使い方ガイドを追加 --- */}
      <div className="container mx-auto px-4 py-8 mt-12"> {/* 適宜マージンを追加 */}
        <h2 className="text-3xl font-bold mb-6 text-center">使い方ガイド</h2>

        <p className="mb-8 text-center">
          クイックカットを使って画像を背景透過する基本的な手順を分かりやすく説明します。
        </p>

        <div className="space-y-8"> {/* 各セクションの間隔 */}
          <div>
            <h3 className="text-2xl font-semibold mb-3">1. 画像をアップロードする</h3>
            <p>
              背景を透過したい画像をアップロードエリアにドラッグ＆ドロップするか、クリックしてファイルを選択します。複数画像の一括アップロードにも対応しています。
            </p>
          </div>

          <div>
            <h3 className="text-2xl font-semibold mb-3">2. 背景透過処理の開始</h3>
            <p>
              画像をアップロードすると、自動的に背景透過処理が開始されます。
              （もし手動で開始ボタンが必要な場合は、その手順を記載）
            </p>
          </div>

          <div>
            <h3 className="text-2xl font-semibold mb-3">3. 処理結果の確認とダウンロード</h3>
            <p>
              処理が完了すると、透過された画像が表示されます。ダウンロードボタンをクリックして、結果の画像を保存します。
            </p>
          </div>

          <div>
            <h3 className="text-2xl font-semibold mt-6 mb-3">その他の便利な機能</h3>
            <ul className="list-disc list-inside ml-4">
              <li>HEIC/HEIF形式への対応</li>
              <li>複数画像の一括処理</li>
            </ul>
          </div>
        </div> {/* 各セクションの間隔 終了 */}

        <p className="mt-8 text-center">
          ご不明な点がありましたら、<a href="/privacy-policy" className="text-blue-600 hover:underline">プライバシーポリシー</a>をご確認いただくか、お問い合わせください。（お問い合わせページがあればリンクを修正）
        </p>
      </div>

      {/* --- 元々あったコード (Vercelロゴなど) は削除またはコメントアウト --- */}
      {/* <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:size-auto lg:bg-none">
        ... (元のコード) ...
      </div> */}
    </main>
  );
}