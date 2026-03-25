import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'QuickTools | 特定商取引法に基づく表記',
  description: 'QuickTools（イージーカット）の特定商取引法に基づく表記です。',
};

export default function TokushohoPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">特定商取引法に基づく表記</h1>

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200 text-sm">
          <tbody>
            <tr className="border-b border-gray-200">
              <th className="w-1/3 bg-gray-50 px-4 py-3 text-left font-semibold">販売事業者</th>
              <td className="px-4 py-3">QuickTools運営</td>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="bg-gray-50 px-4 py-3 text-left font-semibold">運営責任者</th>
              <td className="px-4 py-3">新海 継俊</td>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="bg-gray-50 px-4 py-3 text-left font-semibold">所在地</th>
              <td className="px-4 py-3">請求があった場合、遅滞なく開示します。</td>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="bg-gray-50 px-4 py-3 text-left font-semibold">電話番号</th>
              <td className="px-4 py-3">請求があった場合、遅滞なく開示します。</td>
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
              <th className="bg-gray-50 px-4 py-3 text-left font-semibold">販売価格</th>
              <td className="px-4 py-3">Proプラン: 月額780円（税込）</td>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="bg-gray-50 px-4 py-3 text-left font-semibold">商品代金以外の必要料金</th>
              <td className="px-4 py-3">インターネット接続にかかる通信料等はお客様のご負担となります。</td>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="bg-gray-50 px-4 py-3 text-left font-semibold">支払方法</th>
              <td className="px-4 py-3">クレジットカード（Stripe 決済）</td>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="bg-gray-50 px-4 py-3 text-left font-semibold">支払時期</th>
              <td className="px-4 py-3">申込時に課金され、以降は契約更新日に自動で請求されます。</td>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="bg-gray-50 px-4 py-3 text-left font-semibold">サービス提供時期</th>
              <td className="px-4 py-3">決済完了後、直ちにPro機能をご利用いただけます。</td>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="bg-gray-50 px-4 py-3 text-left font-semibold">解約方法</th>
              <td className="px-4 py-3">アカウント画面の「Proを管理する」からStripeカスタマーポータルで解約できます。</td>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="bg-gray-50 px-4 py-3 text-left font-semibold">返品・キャンセル</th>
              <td className="px-4 py-3">
                デジタルサービスの性質上、購入後の返金は原則として承っておりません。
                法令に基づき返金が必要な場合はこの限りではありません。
              </td>
            </tr>
            <tr>
              <th className="bg-gray-50 px-4 py-3 text-left font-semibold">動作環境</th>
              <td className="px-4 py-3">最新の主要ブラウザ（Chrome / Safari / Edge / Firefox）</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-8 text-sm text-gray-500">制定日: 2026年3月25日</p>
      <p className="text-sm text-gray-500">最終改定日: 2026年3月25日</p>
    </div>
  );
}
