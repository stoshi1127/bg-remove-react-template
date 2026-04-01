import type { Metadata } from 'next';

import { getSiteUrl } from '@/lib/auth/siteUrl';

export const metadata: Metadata = {
  title: 'QuickTools | 特定商取引法に基づく表記',
  description: 'QuickTools（イージーカット）の特定商取引法に基づく表記です。',
};

/** 消費者庁「通信販売に関する表示について」 */
const CONSUMER_AFFAIRS_REPRESENTATION = 'https://www.no-trouble.caa.go.jp/qa/advertising.html';

export default function TokushohoPage() {
  const siteUrl = getSiteUrl();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">特定商取引法に基づく表記</h1>

      <p className="mb-6 text-sm leading-relaxed text-gray-800">
        当サイトは通信販売（有償の役務提供）に該当するため、特定商取引法に基づく表記を掲載しています。
        一部情報は、消費者からの請求があれば書面または電子メール等により遅滞なく提供いたします。
        詳細は消費者庁の
        <a
          href={CONSUMER_AFFAIRS_REPRESENTATION}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          通信販売に関する表示について
        </a>
        もご参照ください。
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200 text-sm">
          <tbody>
            <tr className="border-b border-gray-200">
              <th className="w-1/3 bg-gray-50 px-4 py-3 text-left font-semibold">販売事業者</th>
              <td className="px-4 py-3">
                販売事業者の氏名（名称）は、消費者からの請求があれば書面または電子メール等により遅滞なく提供いたします（ご請求先:{' '}
                <a href="mailto:support@quicktools.jp" className="text-blue-600 hover:underline">
                  support@quicktools.jp
                </a>
                ）。
              </td>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="bg-gray-50 px-4 py-3 text-left font-semibold">代表者</th>
              <td className="px-4 py-3">（個人事業のため、販売事業者に同じ）</td>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="bg-gray-50 px-4 py-3 text-left font-semibold">所在地</th>
              <td className="px-4 py-3">
                所在地は、消費者からの請求があれば書面または電子メール等により遅滞なく提供いたします（ご請求先:{' '}
                <a href="mailto:support@quicktools.jp" className="text-blue-600 hover:underline">
                  support@quicktools.jp
                </a>
                ）。
              </td>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="bg-gray-50 px-4 py-3 text-left font-semibold">電話番号</th>
              <td className="px-4 py-3">
                電話番号は、消費者からの請求があれば書面または電子メール等により遅滞なく提供いたします（ご請求先:{' '}
                <a href="mailto:support@quicktools.jp" className="text-blue-600 hover:underline">
                  support@quicktools.jp
                </a>
                ）。
              </td>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="bg-gray-50 px-4 py-3 text-left font-semibold">メールアドレス</th>
              <td className="px-4 py-3">
                <a href="mailto:support@quicktools.jp" className="text-blue-600 hover:underline">
                  support@quicktools.jp
                </a>
              </td>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="bg-gray-50 px-4 py-3 text-left font-semibold">URL</th>
              <td className="px-4 py-3">
                <a href={`${siteUrl}/`} className="text-blue-600 hover:underline">
                  {siteUrl}/
                </a>
              </td>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="bg-gray-50 px-4 py-3 text-left font-semibold">販売価格</th>
              <td className="px-4 py-3">各プランページに表示された価格（税込）</td>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="bg-gray-50 px-4 py-3 text-left font-semibold">商品代金以外の必要料金</th>
              <td className="px-4 py-3">
                なし（※お客様のインターネット接続にかかる通信料等は、お客様のご負担となります。）
              </td>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="bg-gray-50 px-4 py-3 text-left font-semibold">支払方法</th>
              <td className="px-4 py-3">クレジットカード（Stripe経由）</td>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="bg-gray-50 px-4 py-3 text-left font-semibold">支払時期</th>
              <td className="px-4 py-3">購入時に即時決済。サブスクリプションは毎月自動更新に伴い請求されます。</td>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="bg-gray-50 px-4 py-3 text-left font-semibold">商品の引渡時期</th>
              <td className="px-4 py-3">決済完了後、即時に当サービスをご利用いただけます。</td>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="bg-gray-50 px-4 py-3 text-left font-semibold">返品・キャンセル</th>
              <td className="px-4 py-3">
                デジタルサービスの性質上、返品・返金は原則として承っておりません。法令に基づき返金が必要な場合はこの限りではありません。
                サブスクリプションの解約は、アカウント画面の「Proを管理する」からStripeカスタマーポータルにアクセスし、いつでも可能です。解約後も、現在の請求期間の終了までサービスをご利用いただけます。
              </td>
            </tr>
            <tr>
              <th className="bg-gray-50 px-4 py-3 text-left font-semibold">動作環境</th>
              <td className="px-4 py-3">最新の主要ブラウザ（Chrome / Safari / Edge / Firefox）、インターネット接続環境</td>
            </tr>
          </tbody>
        </table>
      </div>

      

      <p className="mt-8 text-sm text-gray-500">制定日: 2026年3月25日</p>
      <p className="text-sm text-gray-500">最終改定日: 2026年4月1日</p>
    </div>
  );
}
