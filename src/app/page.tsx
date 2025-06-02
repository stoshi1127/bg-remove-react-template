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
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
        {/* 背景グラデーション */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-cyan-50"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/20 via-transparent to-transparent"></div>
        
        {/* 浮遊要素 */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full opacity-10 animate-pulse-soft"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full opacity-10 animate-pulse-soft" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-40 left-20 w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full opacity-10 animate-pulse-soft" style={{animationDelay: '2s'}}></div>

        <div className="relative z-10 text-center max-w-6xl mx-auto">
          {/* メインタイトル */}
          <div className="animate-fade-in-up">
            <h1 className="text-responsive-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-6">
              {siteName}
            </h1>
            <p className="text-responsive-md text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              複数の画像を一度にアップロードして、<span className="font-semibold text-indigo-600">AIが自動で背景を透過</span>できます。<br />
              iPhoneで撮影した画像（HEIC/HEIF形式）も自動的に変換されます。
            </p>
          </div>
          
          {/* CTAセクション */}
          <div className="animate-fade-in-up" style={{animationDelay: '0.2s'}}>
            <div className="relative bg-white/80 backdrop-blur-sm border border-white/20 shadow-large p-8 rounded-3xl mb-12 max-w-4xl mx-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-blue-500/5 rounded-3xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-center mb-6">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 rounded-2xl mr-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    今すぐ無料で背景透過！
                  </h2>
                </div>
                <p className="text-lg text-gray-600 mb-6">登録不要・制限なし・高速処理でプロ品質の仕上がり</p>
                <div className="flex flex-wrap justify-center gap-4 mb-6">
                  <span className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                    </svg>
                    完全無料
                  </span>
                  <span className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"></path>
                    </svg>
                    高速処理
                  </span>
                  <span className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                    </svg>
                    安全・安心
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* アップロードエリア */}
          <div className="animate-fade-in-up" style={{animationDelay: '0.4s'}}>
            <BgRemoverMulti />
          </div>
        </div>
      </section>

      {/* メインコンテンツ */}
      <main className="relative">
        {/* 使い方ガイド */}
        <section className="py-20 px-4 bg-gradient-to-b from-white to-gray-50">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-16 animate-fade-in-up">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">使い方ガイド</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                イージーカットを使って画像を背景透過する基本的な手順を分かりやすく説明します。<br />
                数ステップで簡単に透過画像を作成できます。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                <GuideCard
                  title="1. 画像をアップロード"
                  icon={
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                    </div>
                  }
                  className="hover-lift"
                  footer={<span className="text-blue-600 font-medium">対応形式: JPG, PNG, HEIC/HEIF など</span>}
                >
                  背景を透過したい画像をアップロードエリアにドラッグ＆ドロップするか、クリックしてファイルを選択します。複数画像の一括アップロードにも対応しています。
                </GuideCard>
              </div>
              
              <div className="animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                <GuideCard
                  title="2. 処理開始"
                  icon={
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-xl">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                  }
                  className="hover-lift"
                  footer={<span className="text-green-600 font-medium">高精度AIが自動で背景を検出して透過します</span>}
                >
                  画像をアップロードすると、自動的に背景透過処理が開始されます。画面に処理の進行状況が表示されるので、完了までお待ちください。
                </GuideCard>
              </div>
              
              <div className="animate-fade-in-up" style={{animationDelay: '0.3s'}}>
                <GuideCard
                  title="3. 結果をダウンロード"
                  icon={
                    <div className="bg-gradient-to-br from-purple-500 to-violet-600 p-3 rounded-xl">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                      </svg>
                    </div>
                  }
                  className="hover-lift"
                  footer={<span className="text-purple-600 font-medium">透過画像はPNG形式で保存されます</span>}
                >
                  処理が完了すると、透過された画像が表示されます。ダウンロードボタンをクリックして、透過処理された画像を保存しましょう。
                </GuideCard>
              </div>
            </div>
          </div>
        </section>

        {/* 機能紹介セクション */}
        <section className="py-20 px-4 bg-white">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-16 animate-fade-in-up">
              <h3 className="text-3xl font-bold text-gray-900 mb-6">その他の便利な機能</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="animate-slide-in-left">
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-8 rounded-3xl shadow-soft hover-lift">
                  <div className="flex items-start mb-6">
                    <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-2xl mr-6">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold text-gray-900 mb-3">HEIC/HEIF形式への対応</h4>
                      <p className="text-gray-700 text-lg leading-relaxed">
                        iPhoneで撮影したHEIC/HEIF形式の画像も自動変換して処理します。特別な事前変換は不要です。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="animate-slide-in-left" style={{animationDelay: '0.2s'}}>
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-8 rounded-3xl shadow-soft hover-lift">
                  <div className="flex items-start mb-6">
                    <div className="bg-gradient-to-br from-teal-500 to-cyan-600 p-3 rounded-2xl mr-6">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold text-gray-900 mb-3">複数画像の一括処理</h4>
                      <p className="text-gray-700 text-lg leading-relaxed">
                        複数の画像を一度にアップロードして、効率よく背景透過処理ができます。時間の節約に最適です。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* トリミング機能への誘導セクション */}
        <section className="py-20 px-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
          <div className="container mx-auto max-w-4xl text-center animate-fade-in-up">
            <div className="bg-white/80 backdrop-blur-sm p-12 rounded-3xl shadow-large hover-lift">
              <h3 className="text-3xl font-bold text-gray-900 mb-6">背景透過＋画像トリミングで完璧な仕上がり</h3>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                背景透過だけでなく、画像のトリミングも簡単に行えます。<br />
                SNSやECサイトに最適なサイズに調整しましょう。
              </p>
              <Link href="/trim">
                <button className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-large">
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
                  </svg>
                  イージートリミングを使ってみる
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* SEO強化：FAQ・よくある質問セクション */}
        <div className="mt-16 bg-white p-8 rounded-xl shadow-lg">
          <h3 className="text-2xl font-semibold mb-6 text-center">よくある質問（FAQ）</h3>
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="text-lg font-medium mb-2">無料で背景透過できますか？</h4>
              <p className="text-gray-700">はい、イージーカットは完全無料で背景透過・背景除去処理ができます。登録も不要で、すぐにご利用いただけます。</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="text-lg font-medium mb-2">iPhone（HEIC形式）の画像も処理できますか？</h4>
              <p className="text-gray-700">はい、iPhoneで撮影したHEIC/HEIF形式の画像も自動的にJPEG/PNG形式に変換して処理します。事前変換は不要です。</p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="text-lg font-medium mb-2">複数の画像を一度に処理できますか？</h4>
              <p className="text-gray-700">はい、複数の画像を一括でアップロードして同時に背景透過処理ができます。効率的な作業が可能です。</p>
            </div>
            <div className="border-l-4 border-orange-500 pl-4">
              <h4 className="text-lg font-medium mb-2">処理した画像のセキュリティは大丈夫ですか？</h4>
              <p className="text-gray-700">処理済み画像は60分以内に自動削除され、第三者がアクセスすることはありません。安全にご利用いただけます。</p>
            </div>
            <div className="border-l-4 border-red-500 pl-4">
              <h4 className="text-lg font-medium mb-2">商用利用は可能ですか？</h4>
              <p className="text-gray-700">はい、商用利用も可能です。ECサイトの商品画像、SNS投稿、デザイン制作など、幅広い用途でご活用ください。</p>
            </div>
          </div>
        </div>

        {/* SEO強化：活用事例セクション */}
        <div className="mt-16 bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-xl">
          <h3 className="text-2xl font-semibold mb-6 text-center">イージーカットの活用事例</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <div className="text-center">
              <div className="bg-white p-4 rounded-lg shadow-md mb-4">
                <h4 className="text-lg font-medium mb-2">💼 ビジネス・ECサイト</h4>
                <p className="text-gray-700 text-sm">商品画像の背景除去、カタログ制作、プレゼン資料作成</p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-white p-4 rounded-lg shadow-md mb-4">
                <h4 className="text-lg font-medium mb-2">📱 SNS・個人利用</h4>
                <p className="text-gray-700 text-sm">Instagram投稿、LINE着せ替え、プロフィール画像作成</p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-white p-4 rounded-lg shadow-md mb-4">
                <h4 className="text-lg font-medium mb-2">🎨 デザイン・クリエイティブ</h4>
                <p className="text-gray-700 text-sm">グラフィックデザイン、ポスター制作、Webデザイン</p>
              </div>
            </div>
          </div>
        </div>

        {/* キーワード密度向上のための関連ツール紹介 */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-semibold mb-4">その他の画像編集ツール</h3>
          <p className="text-gray-600 mb-8 max-w-3xl mx-auto">
            背景透過以外にも、画像トリミング、HEIC変換、画像リサイズなど、様々な画像編集・画像加工機能をご提供しています。
            すべて無料でご利用いただけるオンライン画像処理ツールです。
          </p>
        </div>

        <p className="mt-12 text-center text-gray-600">
          ご不明な点がありましたら、<a href="/privacy-policy" className="text-blue-600 hover:underline font-medium">プライバシーポリシー</a>をご確認ください。
        </p>
      </main>
    </>
  );
}