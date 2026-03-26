import type { Metadata } from 'next';
import BgRemoverMulti from '../components/BgRemover';
import BrandIcon from '../components/BrandIcon';
import GuideCard from '../components/GuideCard';
import ProCtaSection from '../components/ProCtaSection';
import TrackedLink from '../components/TrackedLink';
import { getCurrentUser } from '@/lib/auth/session';

const siteName = 'イージーカット';
const heroTrustPoints = ['登録不要', 'ブラウザ完結', 'JPG・PNG・HEIC対応', '一括処理', '商用利用可'];
const browserStrengths = [
  {
    title: 'インストール不要ですぐ使える',
    description: '画像をアップロードするだけで背景透過を開始できます。PCでもスマホでもブラウザだけで完結します。',
  },
  {
    title: 'HEICを含む主要形式に対応',
    description: 'iPhoneのHEIC/HEIF、JPG、PNGをそのまま読み込み、事前変換なしで背景削除を進められます。',
  },
  {
    title: '無料でも実務の下準備に使いやすい',
    description: '登録不要で背景透過とZIP保存まで使えます。まず無料で試し、業務用途だけ Pro に切り替えられます。',
  },
];
const batchUseCases = [
  {
    title: 'EC・商品画像の整形',
    description: '商品写真をまとめて背景削除し、白背景やテンプレ背景に差し替えて出品用画像を揃えられます。',
  },
  {
    title: 'フリマ・オークション出品',
    description: 'スマホで撮った複数写真を一括背景透過し、見やすい商品一覧画像を短時間で作れます。',
  },
  {
    title: 'SNS運用・社内資料づくり',
    description: '人物やモノの切り抜きをまとめて用意し、投稿画像やプレゼン資料の素材づくりを効率化できます。',
  },
];
const faqItems = [
  {
    question: '背景透過はブラウザだけでできますか？',
    answer: 'はい。イージーカットはブラウザ完結の背景透過サイトです。ソフトのインストールや会員登録なしで、そのまま背景削除を始められます。',
  },
  {
    question: '画像透過を無料でできますか？',
    answer: 'はい。無料で画像透過と背景削除ができます。複数画像の一括処理やZIPダウンロードもすぐに試せます。',
  },
  {
    question: '背景削除した画像を一括で保存できますか？',
    answer: 'はい。複数の画像をまとめて処理し、完了後にZIP形式で一括保存できます。商品画像や出品写真の整理に向いています。',
  },
  {
    question: 'iPhoneのHEIC画像も背景透過できますか？',
    answer: 'はい。HEIC/HEIF画像を自動変換して処理するため、iPhoneで撮影した写真もそのまま背景透過できます。',
  },
  {
    question: '無料プランでも大きな画像を処理できますか？',
    answer: 'はい。無料プランでも大きな画像は自動で軽くして処理できます。より高画質で出力したい場合や大きな画像をそのまま扱いたい場合は Pro が向いています。',
  },
  {
    question: '背景透過だけでなく、色や背景を変えられますか？',
    answer: 'はい。背景をテンプレートから選ぶか、カラーピッカーで背景色を変更したりできます。Proでは任意の画像やAIを使用した背景合成もできます。',
  },
  {
    question: '商用利用できる背景透過ツールですか？',
    answer: 'はい。ECサイトの商品画像、SNS投稿、広告素材、社内資料など、商用利用を含む幅広い用途で使えます。',
  },
];
const relatedTools = [
  {
    href: '/trim',
    title: '画像トリミングをする',
    description: '背景透過後にサイズを整えたいときは、SNSアイコンや商品画像向けの比率でそのままトリミングできます。',
    source: 'trim_card',
  },
  {
    href: '/tone',
    title: '写真の色味を調整する',
    description: '商品写真やSNS画像の明るさ、色味、トーンを整えたいときはイージートーンへ続けて移動できます。',
    source: 'tone_card',
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bg.quicktools.jp';
  const title = '無料の背景透過サイト・背景削除ツール | イージーカット';
  const description = '無料で背景透過・背景削除ができるブラウザ完結のオンラインツールです。画像透過、一括処理、HEIC対応、ZIPダウンロードまで登録不要で使えます。';

  return {
    title,
    description,
    metadataBase: new URL(siteUrl),
    alternates: { canonical: '/' },
    keywords: [
      '背景透過サイト',
      '背景削除',
      '画像透過',
      '背景透過 無料',
      '背景透過 ブラウザ',
      '一括背景透過',
      'HEIC',
      'オンライン画像処理',
      '商用利用',
      'イージーカット',
    ],
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
      title,
      description,
      url: siteUrl,
      siteName: 'QuickTools - 無料AI画像編集ツール',
      locale: 'ja_JP',
      type: 'website',
      images: [
        {
          url: '/ogp-main.jpg',
          width: 1200,
          height: 630,
          alt: '無料の背景透過サイト イージーカット',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: '無料の背景透過サイトとして、画像透過、背景削除、一括処理、HEIC対応をブラウザだけで利用できます。',
      images: [
        {
          url: '/ogp-main.jpg',
          alt: '無料の背景透過サイト イージーカット',
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
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: siteName,
    alternateName: 'EasyCut',
    description: '無料で背景透過・背景削除ができるブラウザ完結のオンラインツール。画像透過、一括処理、HEIC対応、ZIPダウンロードまで登録不要で使えます。',
    url: 'https://bg.quicktools.jp',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web Browser',
    browserRequirements: 'Chrome, Firefox, Safari, Edge対応',
    softwareVersion: '1.0',
    dateCreated: '2025-01-01',
    dateModified: '2026-03-25',
    inLanguage: 'ja',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'JPY',
      availability: 'https://schema.org/InStock',
      description: '登録不要で無料利用を開始できます',
      validFrom: '2025-01-01',
    },
    featureList: [
      '背景透過・背景削除',
      '複数画像の一括処理',
      'HEIC/HEIF形式の自動変換',
      'ZIPファイル一括ダウンロード',
      'ブラウザ完結・登録不要',
      '背景色変更とテンプレート背景',
      '商用利用対応',
      '高画質なProオプション',
    ],
    screenshot: 'https://bg.quicktools.jp/ogp-main.jpg',
    creator: {
      '@type': 'Organization',
      name: 'QuickTools',
      url: 'https://bg.quicktools.jp',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      bestRating: '5',
      worstRating: '1',
      reviewCount: '1250',
      ratingCount: '1250',
    },
    sameAs: ['https://bg.quicktools.jp'],
  };

  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
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

      <section className="bg-white py-10 sm:py-14 md:py-16 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="animate-fade-in-up mb-8 sm:mb-10 md:mb-12">
            <p className="text-xs sm:text-sm font-semibold tracking-[0.24em] text-blue-700 uppercase mb-4">
              背景透過サイト / 背景削除 / 画像透過
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tight text-slate-900 mb-3 sm:mb-4">
              背景透過を素早く簡単に
            </h1>
            <div className="mb-4 sm:mb-5 flex items-center justify-center gap-3">
              <BrandIcon size={38} className="" />
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">
                {siteName}
              </p>
            </div>
            <p className="text-base sm:text-lg md:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto">
              写真や画像の背景透過・背景削除をブラウザだけで手早く完結。<br/>無料で使えて、JPG・PNG・HEIC対応、<br/>
              複数画像の一括処理、背景合成、ZIPダウンロードにも対応しています。
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {heroTrustPoints.map((point) => (
                <span
                  key={point}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs sm:text-sm font-semibold text-slate-700"
                >
                  {point}
                </span>
              ))}
            </div>
          </div>

          <div id="upload-tool" className="animate-fade-in-up mb-8 sm:mb-10 md:mb-12 scroll-mt-28" style={{ animationDelay: '0.1s' }}>
            <div className="bg-white border-2 border-blue-200 rounded-xl sm:rounded-2xl py-2 sm:py-3 shadow-lg">
              <BgRemoverMulti isPro={isPro} adUserPlan={adUserPlan} />
            </div>
          </div>

          <ProCtaSection isLoggedIn={isLoggedIn} isPro={isPro} />
        </div>
      </section>

      <main className="bg-white">
        <section className="bg-white py-14 sm:py-16 md:py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-10 sm:mb-12 md:mb-16">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">背景透過サイトを探している人へ</h2>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
                無料、ブラウザ完結、一括処理対応の背景透過サイトを探している方に向けて、<br/>イージーカットの強みをまとめています。
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 md:gap-8">
              <div className="animate-fade-in-up h-full" style={{ animationDelay: '0.1s' }}>
                <GuideCard
                  title="無料で背景透過したい"
                  icon={
                    <div className="bg-blue-600 p-3 rounded-xl">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="無料利用アイコン">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                  }
                  className="hover-lift"
                  footer={<span className="text-blue-600 font-medium">登録不要で今すぐ開始</span>}
                >
                  背景透過や背景削除を試したい画像をアップロードするだけで始められます。ログイン前でもすぐに使える無料ツールです。
                </GuideCard>
              </div>

              <div className="animate-fade-in-up h-full" style={{ animationDelay: '0.2s' }}>
                <GuideCard
                  title="ブラウザだけで背景削除したい"
                  icon={
                    <div className="bg-green-600 p-3 rounded-xl">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="ブラウザ完結アイコン">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M5 4h14a2 2 0 012 2v3H3V6a2 2 0 012-2zm-2 7h18v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 15l2 2 4-4"></path>
                      </svg>
                    </div>
                  }
                  className="hover-lift"
                  footer={<span className="text-green-600 font-medium">PCでもスマホでも利用可能</span>}
                >
                  専用ソフトを入れなくても、ブラウザから背景透過できます。JPG、PNG、HEICをまとめて扱えるのでスマホ写真にも向いています。
                </GuideCard>
              </div>

              <div className="animate-fade-in-up h-full" style={{ animationDelay: '0.3s' }}>
                <GuideCard
                  title="複数画像をまとめて透過したい"
                  icon={
                    <div className="bg-purple-600 p-3 rounded-xl">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="一括処理アイコン">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7h16M4 12h10M4 17h16"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 10l3 3-3 3"></path>
                      </svg>
                    </div>
                  }
                  className="hover-lift"
                  footer={<span className="text-purple-600 font-medium">ZIPで一括ダウンロード可能</span>}
                >
                  一度に複数の画像をアップロードし、背景削除後は個別保存またはZIPでまとめてダウンロードできます。
                </GuideCard>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-14 md:py-16 px-4 bg-gray-50">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-8 sm:mb-10 md:mb-12">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">背景削除・画像透過でできること</h2>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
                商品画像からSNSの素材づくりを<br/>1ページで進められます。
              </p>
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">iPhone HEIC画像自動変換</h3>
                    <p className="text-gray-600">
                      iPhoneで撮影したHEIC/HEIF形式の画像も自動変換して背景透過処理できます。
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">複数画像を効率的に処理</h3>
                    <p className="text-gray-600">
                      一度に複数の画像をアップロードして背景をまとめて除去し、ZIPファイルで一括ダウンロードできます。
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">多彩な背景カスタマイズ</h3>
                    <p className="text-gray-600">
                      白や木目に加え、レンガ壁、ボケなどの背景を選び、透過後の画像を自然に背景合成できます。
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">豊富な出力サイズ設定</h3>
                    <p className="text-gray-600">
                      「16:9」や「4:3」などの定番比率に加え、元画像に合わせる設定や被写体にフィットする設定も選べます。
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                      AIで背景を生成・合成
                      <span className="ml-2 text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-400 text-white px-2 py-0.5 rounded-full shadow-sm">PRO</span>
                    </h3>
                    <p className="text-gray-600">
                      テキストで指示するだけで、被写体の影や照明に合わせた自然な背景をAIが自動生成します。
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                      高画質出力・利用制限なし
                      <span className="ml-2 text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-400 text-white px-2 py-0.5 rounded-full shadow-sm">PRO</span>
                    </h3>
                    <p className="text-gray-600">
                      大きなサイズの画像も画質を落とさずに処理でき、広告なしで快適に作業できます。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-14 md:py-16 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">ブラウザで使える無料ツールとしての強み</h2>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
                インストール不要で、個人利用から業務の下準備まで対応できる<br/>使い勝手を重視しています。
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {browserStrengths.map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-gray-50">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">一括背景透過が向いているケース</h2>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
                複数枚の写真や素材をまとめて背景削除したい場面で、<br/>作業時間を大きく短縮できます。
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {batchUseCases.map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
                  <p className="text-xs font-semibold tracking-[0.18em] text-blue-600 uppercase mb-3">利用シーン</p>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">よくある質問</h2>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
                検索されやすい疑問を中心に、背景透過サイトとしての使い方をまとめています。
              </p>
            </div>
            <div className="space-y-6">
              {faqItems.map(({ question, answer }) => (
                <div key={question} className="bg-white p-6 rounded-xl shadow-soft">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{question}</h3>
                  <p className="text-gray-600">{answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-gray-50">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">背景透過の次に使える画像編集ツール</h2>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
                サイズ調整や色味補正も、同じサイト内で続けて使えます。<br/>背景透過後の仕上げまで一気に進められます。
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedTools.map((tool) => (
                <TrackedLink
                  key={tool.href}
                  href={tool.href}
                  eventName="related_tool_click"
                  source={tool.source}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.18em] text-blue-600 uppercase mb-3">関連ツール</p>
                      <h3 className="text-xl font-semibold text-slate-900 mb-3 group-hover:text-blue-700">{tool.title}</h3>
                      <p className="text-sm sm:text-base text-slate-600 leading-relaxed">{tool.description}</p>
                    </div>
                    <div className="mt-1 rounded-full bg-blue-50 p-3 text-blue-600">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                      </svg>
                    </div>
                  </div>
                </TrackedLink>
              ))}
            </div>
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
