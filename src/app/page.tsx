// import Image from "next/image"; // Removed unused import
// componentsフォルダからBgRemoverをインポート (パスは実際の構成に合わせてください)
import BgRemoverMulti from "../components/BgRemover"; // '@/components/...' は src ディレクトリがある場合
// import BgRemover from "../components/BgRemover"; // src ディレクトリがない場合など
import type { Metadata } from 'next'; // コメントアウト解除
import GuideCard from "../components/GuideCard";
import Link from "next/link";
import GuestProPurchase from "../components/GuestProPurchase";
import { getCurrentUser } from '@/lib/auth/session';

const siteName = 'イージーカット';

// メタデータ定義を generateMetadata 関数を使用して動的に生成
export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bg.quicktools.jp';

  return {
    title: "イージーカット - AIで一括背景透過・変更ブラウザツール",
    description: "アップロードした写真や画像の背景を自動で透過（切り抜き）します。白、木目などの定番背景や、カラーピッカーでお好きな色を自由に設定可能。無料で使える高機能な背景リムーバーです。",
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: '/',
    },
    keywords: '背景透過,AI背景除去,写真切り抜き,画像編集,HEIC変換,複数画像処理,無料ツール,オンライン画像処理,背景変更,商用利用可能',
    authors: [{ name: 'QuickTools' }],
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title: "イージーカット - AIで一括背景透過・変更ブラウザツール",
      description: "アップロードした写真や画像の背景を自動で透過（切り抜き）します。白、木目などの定番背景や、カラーピッカーでお好きな色を自由に設定可能。無料で使える高機能な背景リムーバーです。",
      url: siteUrl,
      siteName: 'QuickTools - 無料AI画像編集ツール',
      locale: 'ja_JP',
      type: 'website',
      images: [
        {
          url: '/ogp.png?v=202501',
          width: 1200,
          height: 630,
          alt: 'イージーカット - AI背景透過ツールの紹介画像',
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: "イージーカット - AIで一括背景透過・変更ブラウザツール",
      description: "写真・画像の背景を自動で透過。複数画像の一括処理、HEIC対応、多彩な背景テンプレート。完全無料、登録不要で今すぐ使えます。",
      images: [
        {
          url: '/ogp.png?v=202501',
          alt: 'イージーカット - AI背景透過ツール',
        },
      ],
    },
    other: {
      'theme-color': '#ffffff',
      'msapplication-TileColor': '#2b5797',
      'msapplication-config': '/browserconfig.xml',
    },
  };
}

export default async function Home() {
  const user = await getCurrentUser();
  const isLoggedIn = !!user;
  const isPro = !!user?.isPro;
  const adUserPlan: 'pro' | 'free' | 'guest' = !user ? 'guest' : user.isPro ? 'pro' : 'free';
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "イージーカット",
    "alternateName": "EasyCut",
    "description": "AI技術で背景を自動除去する無料オンラインツール。複数画像の一括処理、HEIC変換、高精度背景透過が可能。",
    "url": "https://bg.quicktools.jp",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Web Browser",
    "browserRequirements": "Chrome, Firefox, Safari, Edge対応",
    "softwareVersion": "1.0",
    "dateCreated": "2025-01-01",
    "dateModified": "2025-01-27",
    "inLanguage": "ja",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "JPY",
      "availability": "https://schema.org/InStock",
      "description": "完全無料でご利用いただけます",
      "validFrom": "2025-01-01"
    },
    "featureList": [
      "AI背景除去・背景透過",
      "複数画像一括処理・バッチ処理", 
      "HEIC/HEIF形式自動変換",
      "高精度AI画像処理",
      "商用利用可能",
      "登録不要・即座に利用可能",
      "ZIPファイル一括ダウンロード",
      "カスタム背景・色変更"
    ],
    "screenshot": "https://bg.quicktools.jp/ogp.png",
    "creator": {
      "@type": "Organization", 
      "name": "QuickTools",
      "url": "https://bg.quicktools.jp"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "bestRating": "5",
      "worstRating": "1",
      "reviewCount": "1250",
      "ratingCount": "1250"
    },
    "sameAs": [
      "https://bg.quicktools.jp"
    ]
  };

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "イージーカットは無料で背景透過できますか？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "はい、完全無料でご利用いただけます。登録不要で、複数画像の一括背景透過も無料です。"
        }
      },
      {
        "@type": "Question", 
        "name": "HEIC形式にも対応していますか？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "はい、iPhoneのHEIC/HEIF画像を自動でJPEG形式に変換して処理します。"
        }
      },
      {
        "@type": "Question",
        "name": "処理した画像の商用利用は可能ですか？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "はい、処理した画像は商用利用可能です。ECサイト、プレゼン資料、広告素材など自由にお使いいただけます。"
        }
      },
      {
        "@type": "Question",
        "name": "どのような画像形式に対応していますか？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "JPG、PNG、HEIC、HEIF形式に対応しています。処理後はPNG形式（透明背景）でダウンロードできます。"
        }
      },
      {
        "@type": "Question",
        "name": "一度に何枚まで処理できますか？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "複数枚の一括処理に対応しており、ドラッグ&ドロップで簡単にアップロードできます。"
        }
      },
      {
        "@type": "Question",
        "name": "無料とProで画像サイズの上限は違いますか？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "はい。無料は送信時に4MB/8MPを目安に自動圧縮して続行できます。Proはより大きい画像（目安25MB/90MP）をそのまま処理できます。"
        }
      },
      {
        "@type": "Question",
        "name": "最終出力画像が大きすぎる場合はどうなりますか？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "最終出力は自動で長辺を調整します。無料は長辺3200px、Proは長辺7000pxを上限の目安として、比率を保ったまま縮小します。"
        }
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      
      {/* ヒーローセクション */}
      <section className="bg-white py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          {/* メインタイトル */}
          <div className="animate-fade-in-up mb-8">
            <h1 className="text-responsive-xl font-bold text-gray-900 mb-6">
              {siteName}
            </h1>
            <p className="text-responsive-md text-gray-600 mb-6 leading-relaxed max-w-2xl mx-auto">
              AIが画像の背景を自動で切り抜き、多彩な背景（グラデーション、レンガなど）や好きな色に合成します。さらに「16:9」や「被写体にフィット」など豊富なアスペクト比を選び、ZIPで一括ダウンロードも可能。
            </p>
          </div>

          {/* アップロードエリア - メイン */}
          <div className="animate-fade-in-up mb-12" style={{animationDelay: '0.1s'}}>
            <div className="bg-white border-2 border-blue-200 rounded-2xl py-3 shadow-lg">
              <BgRemoverMulti isPro={isPro} adUserPlan={adUserPlan} />
            </div>
          </div>
          
          {/* CTAセクション */}
          <div id="pro" className="animate-fade-in-up mb-8 scroll-mt-28" style={{animationDelay: '0.2s'}}>
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
              <div className="flex flex-wrap justify-center gap-3">
                <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                  </svg>
                  完全無料
                </span>
                <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"></path>
                  </svg>
                  高速処理
                </span>
                <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                  </svg>
                  安全・安心
                </span>
                <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"></path>
                  </svg>
                  最大30枚一括処理
                </span>
              </div>

              {!isLoggedIn ? (
                <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <GuestProPurchase />
                </div>
              ) : (
                <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/account"
                    className="inline-flex items-center px-6 py-3 rounded-xl font-semibold bg-gray-900 text-white hover:bg-black transition-colors"
                  >
                    アカウントへ
                  </Link>
                  <p className="text-sm text-gray-600">プラン/請求の確認・管理はアカウントから行えます。</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>



      {/* メインコンテンツ */}
      <main className="bg-white">
        {/* 使い方ガイド */}
        <section className="bg-white py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">AI背景透過の使い方ガイド</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                イージーカットを使って画像の背景を無料で透過する基本的な手順を分かりやすく説明します。
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                <GuideCard
                  title="1. 画像をアップロード"
                  icon={
                    <div className="bg-blue-600 p-3 rounded-xl">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="画像アップロードアイコン">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                    </div>
                  }
                  className="hover-lift"
                  footer={<span className="text-blue-600 font-medium">対応形式: JPG, PNG, HEIC/HEIF など</span>}
                >
                  背景透過したい画像をアップロードエリアにドラッグ＆ドロップするか、クリックしてファイルを選択します。複数画像も同時に選択可能です。
                </GuideCard>
              </div>
              
              <div className="animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                <GuideCard
                  title="2. 背景をカスタマイズ"
                  icon={
                    <div className="bg-green-600 p-3 rounded-xl">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="カスタマイズアイコン">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z"></path>
                      </svg>
                    </div>
                  }
                  className="hover-lift"
                  footer={<span className="text-green-600 font-medium">サイズと背景を自由に設定</span>}
                >
                  出力サイズを「16:9」や「被写体にフィット」などから選択。次に「背景なし」、多彩なテンプレート、またはカラーピッカーでお好みの背景に仕上げます。
                </GuideCard>
              </div>
              
              <div className="animate-fade-in-up" style={{animationDelay: '0.3s'}}>
                <GuideCard
                  title="3. 加工画像をダウンロード"
                  icon={
                    <div className="bg-purple-600 p-3 rounded-xl">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="ダウンロードアイコン">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                      </svg>
                    </div>
                  }
                  className="hover-lift"
                  footer={<span className="text-purple-600 font-medium">個別・一括ダウンロードに対応</span>}
                >
                  プレビューで仕上がりを確認し、個別またはZIPで一括ダウンロード。複数枚の処理もスムーズです。
                </GuideCard>
              </div>
            </div>
          </div>
        </section>

        {/* 機能紹介セクション */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">AI背景透過に便利な追加機能</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-soft hover-lift">
                <div className="flex items-start">
                  <div className="bg-amber-100 p-3 rounded-xl mr-4">
                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="HEIC変換アイコン">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">iPhone HEIC画像自動変換</h4>
                    <p className="text-gray-600">
                      iPhoneで撮影したHEIC/HEIF形式の画像も自動変換して背景透過処理します。
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-soft hover-lift">
                <div className="flex items-start">
                  <div className="bg-teal-100 p-3 rounded-xl mr-4">
                    <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="一括処理アイコン">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">複数画像を効率的に処理</h4>
                    <p className="text-gray-600">
                      一度に複数の画像をアップロードして背景をまとめて除去。完了後はZIPファイルで一括ダウンロードでき、作業時間を大幅に節約できます。
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-soft hover-lift">
                <div className="flex items-start">
                  <div className="bg-rose-100 p-3 rounded-xl mr-4">
                    <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="背景カスタマイズアイコン">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">多彩な背景カスタマイズ</h4>
                    <p className="text-gray-600">
                      白や木目に加え、グラデーションやレンガ壁、ボケなどの新しい背景を追加。カラーピッカーと合わせて、より表現豊かな画像を作成できます。
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-soft hover-lift">
                <div className="flex items-start">
                  <div className="bg-cyan-100 p-3 rounded-xl mr-4">
                    <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="アスペクト比設定アイコン">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4h4m12 4V4h-4M4 16v4h4m12-4v4h-4"></path>
                      <rect x="7" y="7" width="10" height="10" rx="1"></rect>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">豊富な出力サイズ設定</h4>
                    <p className="text-gray-600">
                      「16:9」や「4:3」などの定番比率に加え、元画像の比率を保つ「元画像に合わせる」、被写体の形にぴったり合わせる「被写体にフィット」が選択可能です。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* トリミング機能への誘導セクション */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-3xl text-center">
            <div className="bg-blue-50 border border-blue-100 p-8 rounded-2xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">背景透過＋画像トリミングで完璧な仕上がり</h3>
              <p className="text-gray-700 mb-6">
                背景透過だけでなく、画像のトリミングも簡単に行えます。<br />
                SNSやECサイトに最適なサイズに調整しましょう。
              </p>
              <Link href="/trim">
                <button className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors duration-200">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
                  </svg>
                  イージートリミングを使ってみる
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* SEO強化：FAQ・よくある質問セクション */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">よくある質問（FAQ）</h3>
            </div>
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-soft">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">無料で背景透過できますか？</h4>
                <p className="text-gray-600">はい、イージーカットは完全無料で背景透過・背景除去処理ができます。登録も不要で、すぐにご利用いただけます。</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-soft">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">iPhone（HEIC形式）の画像も処理できますか？</h4>
                <p className="text-gray-600">はい、iPhoneで撮影したHEIC/HEIF形式の画像も自動的にJPEG/PNG形式に変換して処理します。事前変換は不要です。</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-soft">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">複数の画像を一度に処理できますか？</h4>
                <p className="text-gray-600">はい、複数の画像を一括でアップロードして同時に背景透過処理ができます。完了した画像が2枚以上ある場合は「すべてダウンロード」ボタンからZIP形式で一括保存が可能です。</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-soft">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">無料とProで画像サイズの上限は違いますか？</h4>
                <p className="text-gray-600">はい。無料は送信時に4MB/8MPを目安に自動圧縮して続行できます。Proはより大きい画像（目安25MB/90MP）をそのまま処理できます。</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-soft">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">最終出力画像が大きすぎる場合はどうなりますか？</h4>
                <p className="text-gray-600">最終出力は自動で長辺を調整します。無料は長辺3200px、Proは長辺7000pxを上限の目安として、比率を保ったまま縮小します。</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-soft">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">どのような出力サイズが選べますか？</h4>
                <p className="text-gray-600">「1:1」「16:9」「4:3」といった定番の比率のほか、元画像の比率を保つ「元画像に合わせる」、被写体の形にぴったり合わせる「被写体にフィット」が選択可能です。</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-soft">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">処理した画像のセキュリティは大丈夫ですか？</h4>
                <p className="text-gray-600">処理済み画像は60分以内に自動削除され、第三者がアクセスすることはありません。安全にご利用いただけます。</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-soft">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">背景を自由な色に変更できますか？</h4>
                <p className="text-gray-600">はい、背景透過後に表示される「背景をカスタマイズ」セクションで、カラーピッカーを使ってお好きな色を自由に設定できます。白や木目といった定番の背景テンプレートもご用意しています。</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-soft">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">商用利用は可能ですか？</h4>
                <p className="text-gray-600">はい、商用利用も可能です。ECサイトの商品画像、SNS投稿、デザイン制作など、幅広い用途でご活用ください。</p>
              </div>
            </div>
          </div>
        </section>

        {/* X公式アカウント・フィードバックセクション */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-3xl">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-8 rounded-2xl text-center">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">公式Xアカウントをフォロー！</h3>
                <p className="text-gray-700 max-w-2xl mx-auto">
                  毎日「今日は何の日」にちなんだ画像を投稿しています。新機能の紹介やお役立ち情報もお届けします。
                </p>
              </div>
              
              {/* X公式アカウントフォロー */}
              <div className="bg-white p-8 rounded-xl shadow-soft max-w-md mx-auto">
                <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-3">公式Xをフォロー</h4>
                <p className="text-gray-600 mb-6">
                  「今日は何の日」にちなんだ画像投稿や新機能情報を配信中
                </p>
                <a
                  href="https://x.com/QuickToolsJP"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors duration-200 text-lg"
                >
                  <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  フォローする
                </a>
              </div>

              {/* 投稿内容の説明 */}
              <div className="mt-8 pt-8 border-t border-blue-200">
                <div className="flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 mr-2 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <h4 className="text-lg font-semibold text-gray-900">毎日投稿中！</h4>
                </div>
                <p className="text-gray-600 text-sm">
                  「猫の日」「桜の日」など、今日は何の日にちなんだテーマで画像を投稿しています。<br />
                  季節の話題やトレンドに合わせた背景透過の活用例をお楽しみください。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SEO強化：活用事例セクション */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">イージーカットの活用事例</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-soft text-center">
                <div className="text-3xl mb-3">💼</div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">ビジネス・ECサイト</h4>
                <p className="text-gray-600 text-sm">商品画像の背景除去、カタログ制作、プレゼン資料作成</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-soft text-center">
                <div className="text-3xl mb-3">📱</div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">SNS・個人利用</h4>
                <p className="text-gray-600 text-sm">Instagram投稿、LINE着せ替え、プロフィール画像作成</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-soft text-center">
                <div className="text-3xl mb-3">🎨</div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">デザイン・クリエイティブ</h4>
                <p className="text-gray-600 text-sm">グラフィックデザイン、ポスター制作、Webデザイン</p>
              </div>
            </div>
          </div>
        </section>

        {/* キーワード密度向上のための関連ツール紹介 */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="container mx-auto max-w-4xl text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">その他の画像編集ツール</h3>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              背景透過以外にも、画像トリミング、HEIC変換、画像リサイズなど、様々な画像編集・画像加工機能をご提供しています。
              すべて無料でご利用いただけるオンライン画像処理ツールです。
            </p>
          </div>
        </section>

        <div className="py-8 px-4 text-center">
          <p className="text-gray-600">
            ご不明な点がありましたら、<a href="/privacy-policy" className="text-blue-600 hover:text-blue-700 font-medium">プライバシーポリシー</a>をご確認ください。
          </p>
        </div>
      </main>
    </>
  );
}