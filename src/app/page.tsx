// import Image from "next/image"; // Removed unused import
// componentsフォルダからBgRemoverをインポート (パスは実際の構成に合わせてください)
import BgRemoverMulti from "../components/BgRemover"; // '@/components/...' は src ディレクトリがある場合
// import BgRemover from "../components/BgRemover"; // src ディレクトリがない場合など
import type { Metadata } from 'next'; // コメントアウト解除
import GuideCard from "../components/GuideCard";
import Link from "next/link";
import ProCtaSection from "../components/ProCtaSection";
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
        "name": "大きな写真でも処理できますか？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "はい。無料プランでも、大きな写真は自動で軽くしてから処理するので、そのまま使えます。ただし仕上がりの画質が少し下がることがあります。Proプランなら、大きな写真でもそのままキレイに処理できます。"
        }
      },
      {
        "@type": "Question",
        "name": "仕上がりの画像サイズが大きくなりすぎることはありますか？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "いいえ。仕上がりの画像は、大きすぎる場合に自動で見た目の比率を保ったまま縮小されます。無料プランとProプランで上限が異なり、Proの方がより大きなサイズで出力できます。"
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
      <section className="bg-white py-10 sm:py-14 md:py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          {/* メインタイトル */}
          <div className="animate-fade-in-up mb-8 sm:mb-10 md:mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white mb-4 sm:mb-5 md:mb-6">
              {siteName}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
              AIで背景を自動削除・置換。アスペクト比選択や一括ZIPダウンロードにも対応した、クリエイティブを加速させるプロ仕様の切り抜きツール。
            </p>
          </div>

          {/* アップロードエリア - メイン */}
          <div className="animate-fade-in-up mb-8 sm:mb-10 md:mb-12" style={{ animationDelay: '0.1s' }}>
            <div className="bg-white border-2 border-blue-200 rounded-xl sm:rounded-2xl py-2 sm:py-3 shadow-lg">
              <BgRemoverMulti isPro={isPro} adUserPlan={adUserPlan} />
            </div>
          </div>

          {/* CTAセクション（比較表・料金表示・購入導線） */}
          <ProCtaSection isLoggedIn={isLoggedIn} />
        </div>
      </section>



      {/* メインコンテンツ */}
      <main className="bg-white">
        {/* 使い方ガイド */}
        <section className="bg-white py-14 sm:py-16 md:py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-10 sm:mb-12 md:mb-16">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">AI背景透過の使い方ガイド</h2>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
                イージーカットを使って画像の背景を無料で透過する基本的な手順を分かりやすく説明します。
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 md:gap-8">
              <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
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

              <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
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

              <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
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
        <section className="py-12 sm:py-14 md:py-16 px-4 bg-gray-50">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-8 sm:mb-10 md:mb-12">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">AI背景透過に便利な追加機能</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 md:gap-8">
              <div className="bg-white p-5 sm:p-6 rounded-xl shadow-soft hover-lift">
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

              <div className="bg-white p-5 sm:p-6 rounded-xl shadow-soft hover-lift">
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

              <div className="bg-white p-5 sm:p-6 rounded-xl shadow-soft hover-lift">
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

              <div className="bg-white p-5 sm:p-6 rounded-xl shadow-soft hover-lift">
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

              <div className="bg-white p-5 sm:p-6 rounded-xl shadow-soft hover-lift border-2 border-amber-100/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-100/50 to-transparent w-32 h-32 transform rotate-45 translate-x-16 -translate-y-16"></div>
                <div className="flex items-start relative z-10">
                  <div className="bg-indigo-100 p-3 rounded-xl mr-4 flex-shrink-0 flex items-center justify-center">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="AI背景生成アイコン">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                      AIで背景を生成・合成
                      <span className="ml-2 text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-400 text-white px-2 py-0.5 rounded-full shadow-sm">PRO</span>
                    </h4>
                    <p className="text-gray-600">
                      「大理石のテーブルの上に置く」「南国のビーチ」など、テキストで指示するだけで、被写体の影や照明に合わせた自然でリアルな背景をAIが自動生成します。
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 sm:p-6 rounded-xl shadow-soft hover-lift border-2 border-amber-100/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-100/50 to-transparent w-32 h-32 transform rotate-45 translate-x-16 -translate-y-16"></div>
                <div className="flex items-start relative z-10">
                  <div className="bg-amber-100 p-3 rounded-xl mr-4 flex-shrink-0 flex items-center justify-center">
                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Proプランアイコン">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                      高画質出力・利用制限なし
                      <span className="ml-2 text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-400 text-white px-2 py-0.5 rounded-full shadow-sm">PRO</span>
                    </h4>
                    <p className="text-gray-600">
                      大きなサイズの画像も画質を落とさずに高精細なまま処理可能。一日の変換枚数制限もなくなり、広告なしで快適に作業できます。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* トリミング機能への誘導セクション */}
        <section className="py-12 sm:py-14 md:py-16 px-4">
          <div className="container mx-auto max-w-3xl text-center">
            <div className="bg-blue-50 border border-blue-100 p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">背景透過＋画像トリミングで完璧な仕上がり</h3>
              <p className="text-sm sm:text-base text-gray-700 mb-5 sm:mb-6">
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
                <h4 className="text-lg font-semibold text-gray-900 mb-2">大きな写真でも処理できますか？</h4>
                <p className="text-gray-600">はい。無料プランでも、大きな写真は自動で軽くしてから処理するので、そのまま使えます。ただし仕上がりの画質が少し下がることがあります。Proプランなら、大きな写真でもそのままキレイに処理できます。</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-soft">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">仕上がりの画像サイズが大きくなりすぎることはありますか？</h4>
                <p className="text-gray-600">いいえ。仕上がりの画像は、大きすぎる場合に自動で見た目の比率を保ったまま縮小されます。無料プランとProプランで上限が異なり、Proの方がより大きなサイズで出力できます。</p>
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
