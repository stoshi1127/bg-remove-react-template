// import Image from "next/image"; // Removed unused import
// componentsフォルダからBgRemoverをインポート (パスは実際の構成に合わせてください)
import BgRemoverMulti from "../components/BgRemover"; // '@/components/...' は src ディレクトリがある場合
// import BgRemover from "../components/BgRemover"; // src ディレクトリがない場合など
import type { Metadata } from 'next'; // コメントアウト解除
import GuideCard from "../components/GuideCard";
import Link from "next/link";

const siteName = 'イージーカット';
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
      siteName: 'QuickTools',
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
      <div className="container mx-auto px-4 py-12 mt-16"> {/* マージンを増やす */}
        <h2 className="text-3xl font-bold mb-8 text-center">使い方ガイド</h2>

        <p className="mb-12 text-center text-lg text-gray-600 max-w-3xl mx-auto">
          イージーカットを使って画像を背景透過する基本的な手順を分かりやすく説明します。
          数ステップで簡単に透過画像を作成できます。
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8"> {/* グリッドレイアウトに変更 */}
          <GuideCard
            title="1. 画像をアップロード"
            icon={
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            }
            color="bg-blue-100"
            footer={<>対応形式: JPG, PNG, HEIC/HEIF など</>}
          >
            背景を透過したい画像をアップロードエリアにドラッグ＆ドロップするか、クリックしてファイルを選択します。複数画像の一括アップロードにも対応しています。
          </GuideCard>
          <GuideCard
            title="2. 処理開始"
            icon={
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            }
            color="bg-green-100"
            footer={<>高精度AIが自動で背景を検出して透過します</>}
          >
            画像をアップロードすると、自動的に背景透過処理が開始されます。画面に処理の進行状況が表示されるので、完了までお待ちください。
          </GuideCard>
          <GuideCard
            title="3. 結果をダウンロード"
            icon={
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
            }
            color="bg-purple-100"
            footer={<>透過画像はPNG形式で保存されます</>}
          >
            処理が完了すると、透過された画像が表示されます。ダウンロードボタンをクリックして、透過処理された画像を保存しましょう。
          </GuideCard>
        </div>

        {/* 追加機能のセクション */}
        <div className="mt-16 bg-gray-50 p-8 rounded-xl">
          <h3 className="text-2xl font-semibold mb-6 text-center">その他の便利な機能</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start">
              <div className="bg-amber-100 p-2 rounded-full mr-4 mt-1">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-medium mb-2">HEIC/HEIF形式への対応</h4>
                <p className="text-gray-700">iPhoneで撮影したHEIC/HEIF形式の画像も自動変換して処理します。特別な事前変換は不要です。</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-teal-100 p-2 rounded-full mr-4 mt-1">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-medium mb-2">複数画像の一括処理</h4>
                <p className="text-gray-700">複数の画像を一度にアップロードして、効率よく背景透過処理ができます。時間の節約に最適です。</p>
              </div>
            </div>
          </div>
        </div>

        {/* トリミング機能への誘導セクション */}
        <div className="container mx-auto px-4 mt-12 text-center">
          <p className="text-lg text-gray-700 mb-4">
            背景透過だけでなく、画像のトリミングも簡単に行えます。
          </p>
          <Link href="/trim">
            <button className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300">
              イージートリミングを使ってみる
            </button>
          </Link>
        </div>

        <p className="mt-12 text-center text-gray-600">
          ご不明な点がありましたら、<a href="/privacy-policy" className="text-blue-600 hover:underline font-medium">プライバシーポリシー</a>をご確認ください。
        </p>
      </div>

      {/* --- 元々あったコード (Vercelロゴなど) は削除またはコメントアウト --- */}
      {/* <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:size-auto lg:bg-none">
        ... (元のコード) ...
      </div> */}
    </main>
  );
}