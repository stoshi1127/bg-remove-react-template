// import Image from "next/image"; // Removed unused import
// componentsフォルダからBgRemoverをインポート (パスは実際の構成に合わせてください)
import BgRemoverMulti from "../components/BgRemover"; // '@/components/...' は src ディレクトリがある場合
// import BgRemover from "../components/BgRemover"; // src ディレクトリがない場合など
import type { Metadata } from 'next'; // コメントアウト解除
import GuideCard from "../components/GuideCard";
import Link from "next/link";
import Script from 'next/script';

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
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "イージーカット",
    "description": "複数画像の一括背景透過、HEIC変換、画像トリミングが無料で使える日本語AIツール",
    "url": "https://bg.quicktools.jp",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "JPY"
    },
    "featureList": [
      "AI背景透過・除去",
      "複数画像一括処理",
      "HEIC/HEIF形式対応",
      "iPhone画像自動変換",
      "画像トリミング",
      "無料使用"
    ],
    "creator": {
      "@type": "Organization",
      "name": "QuickTools"
    }
  };

  return (
    <>
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
      
      {/* ヒーローセクション */}
      <section className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex flex-col items-center justify-center relative overflow-hidden py-12">
        {/* 背景装飾 */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100/30 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-100/30 rounded-full blur-3xl"></div>
        </div>

        {/* メインコンテンツ */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 lg:px-12 text-center">
          {/* タイトルセクション */}
          <div className="mb-20">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-8 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 bg-clip-text text-transparent">
              {siteName}
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl text-slate-700 mb-12 max-w-4xl mx-auto leading-relaxed">
              AI技術で画像の背景を瞬時に透過。複数画像の一括処理、HEIC自動変換で
              <span className="font-semibold text-blue-700">プロ品質の仕上がり</span>を実現
            </p>
            
            {/* 特徴バッジ */}
            <div className="flex flex-wrap justify-center gap-4 mb-16">
              <span className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full text-slate-700 font-medium shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                完全無料
              </span>
              <span className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full text-slate-700 font-medium shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                高速処理
              </span>
              <span className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full text-slate-700 font-medium shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                安全・安心
              </span>
              <span className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full text-slate-700 font-medium shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                iPhone対応
              </span>
            </div>
          </div>

          {/* アップロードエリア */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 lg:p-12 shadow-xl border border-white/50">
              <h2 className="text-2xl lg:text-3xl font-semibold mb-6 text-slate-800">
                今すぐ無料で背景透過
              </h2>
              <p className="text-slate-600 mb-10 text-lg">
                登録不要・制限なし・高速処理でプロ品質の仕上がり
              </p>
              <BgRemoverMulti />
            </div>
          </div>
        </div>
      </section>

      {/* 使い方ガイド */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-8 text-slate-900">
              使い方ガイド
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              イージーカットを使って画像を背景透過する基本的な手順を分かりやすく説明します。
              数ステップで簡単に透過画像を作成できます。
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            <GuideCard
              title="1. 画像をアップロード"
              icon={
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              }
              color="bg-blue-50"
              footer={<>対応形式: JPG, PNG, HEIC/HEIF など</>}
            >
              背景を透過したい画像をアップロードエリアにドラッグ＆ドロップするか、クリックしてファイルを選択します。複数画像の一括アップロードにも対応しています。
            </GuideCard>
            <GuideCard
              title="2. 処理開始"
              icon={
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              }
              color="bg-green-50"
              footer={<>高精度AIが自動で背景を検出して透過します</>}
            >
              画像をアップロードすると、自動的に背景透過処理が開始されます。画面に処理の進行状況が表示されるので、完了までお待ちください。
            </GuideCard>
            <GuideCard
              title="3. 結果をダウンロード"
              icon={
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
              }
              color="bg-purple-50"
              footer={<>透過画像はPNG形式で保存されます</>}
            >
              処理が完了すると、透過された画像が表示されます。ダウンロードボタンをクリックして、透過処理された画像を保存しましょう。
            </GuideCard>
          </div>
        </div>
      </section>

      {/* 追加機能セクション */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <div className="bg-white rounded-3xl p-12 lg:p-16 shadow-lg">
            <h3 className="text-3xl lg:text-4xl font-bold mb-12 text-center text-slate-900">
              その他の便利な機能
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              <div className="flex items-start p-8 bg-amber-50 rounded-2xl">
                <div className="bg-amber-100 p-4 rounded-xl mr-8 mt-1 flex-shrink-0">
                  <svg className="w-8 h-8 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
                  </svg>
                </div>
                <div>
                  <h4 className="text-xl font-bold mb-4 text-slate-800">HEIC/HEIF形式への対応</h4>
                  <p className="text-slate-700 leading-relaxed">iPhoneで撮影したHEIC/HEIF形式の画像も自動変換して処理します。特別な事前変換は不要です。</p>
                </div>
              </div>
              
              <div className="flex items-start p-8 bg-blue-50 rounded-2xl">
                <div className="bg-blue-100 p-4 rounded-xl mr-8 mt-1 flex-shrink-0">
                  <svg className="w-8 h-8 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
                  </svg>
                </div>
                <div>
                  <h4 className="text-xl font-bold mb-4 text-slate-800">複数画像の一括処理</h4>
                  <p className="text-slate-700 leading-relaxed">複数の画像を一度にアップロードして、効率よく背景透過処理ができます。時間の節約に最適です。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* トリミング機能への誘導セクション */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 text-center">
          <h3 className="text-3xl lg:text-4xl font-bold mb-8 text-white">
            画像トリミングも簡単に
          </h3>
          <p className="text-xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed">
            背景透過だけでなく、画像のトリミングも簡単に行えます。
            SNSアイコンやヘッダー画像の作成に最適です。
          </p>
          <Link href="/trim">
            <button className="bg-white text-blue-600 font-semibold py-4 px-10 rounded-xl hover:bg-blue-50 transition duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-lg">
              イージートリミングを使ってみる
            </button>
          </Link>
        </div>
      </section>

      {/* SEO強化：FAQ・よくある質問セクション */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-20">
            <h3 className="text-3xl lg:text-4xl font-bold mb-8 text-slate-900">
              よくある質問（FAQ）
            </h3>
          </div>
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="border-l-4 border-blue-500 pl-8 py-6 bg-blue-50 rounded-r-lg">
              <h4 className="text-lg font-semibold mb-3 text-slate-800">無料で背景透過できますか？</h4>
              <p className="text-slate-700 leading-relaxed">はい、イージーカットは完全無料で背景透過・背景除去処理ができます。登録も不要で、すぐにご利用いただけます。</p>
            </div>
            <div className="border-l-4 border-green-500 pl-8 py-6 bg-green-50 rounded-r-lg">
              <h4 className="text-lg font-semibold mb-3 text-slate-800">iPhone（HEIC形式）の画像も処理できますか？</h4>
              <p className="text-slate-700 leading-relaxed">はい、iPhoneで撮影したHEIC/HEIF形式の画像も自動的にJPEG/PNG形式に変換して処理します。事前変換は不要です。</p>
            </div>
            <div className="border-l-4 border-purple-500 pl-8 py-6 bg-purple-50 rounded-r-lg">
              <h4 className="text-lg font-semibold mb-3 text-slate-800">複数の画像を一度に処理できますか？</h4>
              <p className="text-slate-700 leading-relaxed">はい、複数の画像を一括でアップロードして同時に背景透過処理ができます。効率的な作業が可能です。</p>
            </div>
            <div className="border-l-4 border-orange-500 pl-8 py-6 bg-orange-50 rounded-r-lg">
              <h4 className="text-lg font-semibold mb-3 text-slate-800">処理した画像のセキュリティは大丈夫ですか？</h4>
              <p className="text-slate-700 leading-relaxed">処理済み画像は60分以内に自動削除され、第三者がアクセスすることはありません。安全にご利用いただけます。</p>
            </div>
            <div className="border-l-4 border-red-500 pl-8 py-6 bg-red-50 rounded-r-lg">
              <h4 className="text-lg font-semibold mb-3 text-slate-800">商用利用は可能ですか？</h4>
              <p className="text-slate-700 leading-relaxed">はい、商用利用も可能です。ECサイトの商品画像、SNS投稿、デザイン制作など、幅広い用途でご活用ください。</p>
            </div>
          </div>
        </div>
      </section>

      {/* SEO強化：活用事例セクション */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-20">
            <h2 className="text-3xl lg:text-4xl font-bold mb-8 text-slate-900">
              イージーカットの活用事例
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-white p-8 rounded-2xl shadow-sm mb-4 hover:shadow-md transition-shadow">
                <h4 className="text-lg font-semibold mb-4 text-slate-800">ビジネス・ECサイト</h4>
                <p className="text-slate-600">商品画像の背景除去、カタログ制作、プレゼン資料作成</p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-white p-8 rounded-2xl shadow-sm mb-4 hover:shadow-md transition-shadow">
                <h4 className="text-lg font-semibold mb-4 text-slate-800">SNS・個人利用</h4>
                <p className="text-slate-600">Instagram投稿、LINE着せ替え、プロフィール画像作成</p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-white p-8 rounded-2xl shadow-sm mb-4 hover:shadow-md transition-shadow">
                <h4 className="text-lg font-semibold mb-4 text-slate-800">デザイン・クリエイティブ</h4>
                <p className="text-slate-600">グラフィックデザイン、ポスター制作、Webデザイン</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* キーワード密度向上のための関連ツール紹介 */}
      <section className="py-24 bg-white text-center">
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <h2 className="text-3xl lg:text-4xl font-semibold mb-6 text-slate-900">その他の画像編集ツール</h2>
          <p className="text-slate-600 mb-8 max-w-3xl mx-auto text-lg leading-relaxed">
            背景透過以外にも、画像トリミング、HEIC変換、画像リサイズなど、様々な画像編集・画像加工機能をご提供しています。
            すべて無料でご利用いただけるオンライン画像処理ツールです。
          </p>
        </div>
      </section>

      <div className="py-12 text-center bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <p className="text-slate-600">
            ご不明な点がありましたら、<a href="/privacy-policy" className="text-blue-600 hover:underline font-medium">プライバシーポリシー</a>をご確認ください。
          </p>
        </div>
      </div>
    </>
  );
}