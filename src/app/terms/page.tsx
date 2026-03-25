import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'QuickTools | 利用規約',
  description: 'QuickTools（イージーカット）の利用規約です。',
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">利用規約</h1>

      <p className="mb-4">
        本利用規約（以下「本規約」といいます。）は、QuickTools運営（以下「当方」といいます。）が提供する
        「QuickTools」（以下「本サービス」といいます。）の利用条件を定めるものです。
        ユーザーの皆さまには、本規約に同意のうえ本サービスをご利用いただきます。
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">第1条（適用）</h2>
      <p>
        本規約は、ユーザーと当方との間の本サービス利用に関わる一切の関係に適用されます。
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">第2条（アカウント）</h2>
      <ul className="list-disc list-inside ml-4 space-y-1">
        <li>ユーザーは、真実かつ正確な情報を用いてログイン・購入手続きを行うものとします。</li>
        <li>ユーザーは、自己の責任でアカウント情報を管理するものとします。</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-3">第3条（料金・支払い）</h2>
      <ul className="list-disc list-inside ml-4 space-y-1">
        <li>Proプランの料金は、当方が本サービス上で表示する金額とします（現在: 月額780円）。</li>
        <li>支払いは、Stripe, Inc. が提供する決済基盤を通じて行われます。</li>
        <li>課金日、請求日、支払い方法の変更・解約は、Stripeカスタマーポータルまたは当方指定の方法で行います。</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-3">第4条（禁止事項）</h2>
      <ul className="list-disc list-inside ml-4 space-y-1">
        <li>法令または公序良俗に違反する行為</li>
        <li>第三者の権利（著作権、肖像権、商標権等）を侵害する行為</li>
        <li>本サービスの運営を妨害する行為</li>
        <li>不正アクセスまたはこれを試みる行為</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-3">第5条（サービスの停止・変更）</h2>
      <p>
        当方は、保守、障害対応、その他必要がある場合、事前通知なく本サービスの全部または一部を停止・変更できるものとします。
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">第6条（免責）</h2>
      <ul className="list-disc list-inside ml-4 space-y-1">
        <li>当方は、本サービスの完全性、正確性、有用性、特定目的適合性を保証するものではありません。</li>
        <li>当方は、本サービスの利用によりユーザーに生じた損害について、当方に故意または重過失がある場合を除き責任を負いません。</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-3">第7条（規約の変更）</h2>
      <p>
        当方は、必要と判断した場合、本規約を変更できるものとします。変更後の規約は、本サービス上に掲載した時点で効力を生じます。
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">第8条（準拠法・裁判管轄）</h2>
      <p>
        本規約の解釈には日本法を準拠法とし、本サービスに関して紛争が生じた場合は、当方所在地を管轄する裁判所を専属的合意管轄とします。
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">お問い合わせ</h2>
      <p>
        本規約に関するお問い合わせは、
        <a href="mailto:support@quicktools.jp" className="text-blue-600 hover:underline ml-1">
          support@quicktools.jp
        </a>
        までご連絡ください。
      </p>

      <p className="mt-8 text-sm text-gray-500">制定日: 2026年3月25日</p>
      <p className="text-sm text-gray-500">最終改定日: 2026年3月25日</p>

      <div className="mt-8">
        <Link href="/privacy-policy" className="text-blue-600 hover:underline">
          プライバシーポリシーを見る
        </Link>
      </div>
    </div>
  );
}
