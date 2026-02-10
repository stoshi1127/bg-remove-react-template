import type { Metadata } from 'next';

// メタデータ定義
export const metadata: Metadata = {
  title: 'QuickTools | プライバシーポリシー',
  description: 'QuickToolsのプライバシーポリシーに関するページです。個人情報の取り扱いについて説明しています。',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">プライバシーポリシー</h1>

      <p>制定日：2025年5月19日<br />最終改定日：2026年1月30日</p>

      <p className="mt-4">
        QuickTools（以下「当サイト」といいます）は、当サイトが提供するイージーカットサービスおよびイージートリミングサービス（以下「本サービス」といいます）における、ユーザーの個人情報を含む利用者情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます）を定めます。
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">1. 収集する利用者情報及び収集方法</h2>
      <p>
        本ポリシーにおいて、「利用者情報」とは、ユーザーの識別に係る情報、通信サービス上の行動履歴、その他ユーザーのスマートフォン、PC等の端末においてユーザーと関連して生成または蓄積された情報であって、本ポリシーに基づき当サイトが収集するものを意味するものとします。
        本サービスにおいて当サイトが収集する利用者情報は、その収集方法に応じて、以下のようなものとなります。
      </p>
      <h3 className="text-xl font-semibold mt-4 mb-2">(1) ユーザーが本サービスを利用するにあたって、当サイトが収集する情報</h3>
      <ul className="list-disc list-inside ml-4">
        <li>IPアドレス</li>
        <li>Cookie情報</li>
        <li>ユーザーエージェント情報</li>
        <li>メールアドレス（ログインリンク送信、Proサブスクリプション購入手続、およびユーザー識別のため）</li>
        <li>本サービスの利用履歴（アップロードされた画像ファイル、処理結果の画像ファイル、利用日時など）</li>
      </ul>
      <h3 className="text-xl font-semibold mt-4 mb-2">(2) ユーザーが本サービスで画像処理（背景除去・トリミング等）のためにアップロードする画像ファイル</h3>
      <p>
        本サービスでは、ユーザーが背景除去やトリミング等の画像処理のためにアップロードした画像ファイル（以下「アップロード画像」といいます）を、処理のために一時的にサーバー（Replicate社が提供するAPIサーバーを含みます）に送信します。
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">2. 利用目的</h2>
      <p>本サービスのサービス提供にかかわる利用者情報の具体的な利用目的は以下のとおりです。</p>
      <ul className="list-disc list-inside ml-4">
        <li>本サービスの提供、維持、保護及び改善のため</li>
        <li>ログインリンクの送信、ログイン認証、セッション管理のため</li>
        <li>Proサブスクリプションの購入手続、請求、支払い管理、カスタマーポータル提供のため</li>
        <li>本サービスに関するご案内、お問い合せ等への対応のため</li>
        <li>本サービスに関する当サイトの規約、ポリシー等（以下「規約等」といいます。）に違反する行為に対する対応のため</li>
        <li>本サービスに関する規約等の変更などを通知するため</li>
        <li>上記の利用目的に付随する利用目的のため</li>
        <li>
          アクセス解析、広告配信のため（Google Analytics、Google AdSenseを利用します）<br />
          当サイトでは、Google LLC（以下「Google社」といいます）が提供するアクセス解析ツール「Google Analytics」及び広告配信サービス「Google AdSense」を利用しています。これらサービスはトラフィックデータの収集のためにCookieを使用します。このトラフィックデータは匿名で収集されており、個人を特定するものではありません。これらのサービスにおいて取得・収集される情報については、Google社のプライバシーポリシーをご確認ください。
          <ul className="list-disc list-inside ml-4">
            <li>Google プライバシーポリシー: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://policies.google.com/privacy</a></li>
          </ul>
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-6 mb-3">3. 画像データの取り扱いについて</h2>
      <ul className="list-disc list-inside ml-4">
        <li>
          アップロード画像は、背景除去やトリミング等の画像処理目的でのみ利用し、Replicate社が提供するAPIに送信されます。
        </li>
        <li>
          Replicate社へ送信されたアップロード画像及び処理結果の画像データは、Replicate社のシステム上で処理後、同社のプライバシーポリシーに基づき、サービス提供に必要な期間、一時的に保存されることがあります。当サイト（QuickTools）は、Replicateサーバー上での一時保存を除き、ユーザーがアップロードした画像データ及び処理結果の画像データを、当サイト独自のサーバーやストレージに意図的に保存することはありません。Replicate社におけるデータの取り扱いについては、Replicate社のプライバシーポリシー（<a href="https://replicate.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://replicate.com/privacy</a>）をご確認ください。
        </li>
        <li>
          当サイトは、アップロード画像及び処理結果の画像データを、上記処理目的以外で利用したり、第三者に不当に開示したりすることはありません。ただし、法令に基づく場合や、人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難であるときなどを除きます。
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-6 mb-6">4. 第三者提供</h2>
      <p>
        当サイトは、利用者情報のうち、個人情報については、あらかじめユーザーの同意を得ないで、第三者（日本国外にある者を含みます。）に提供しません。但し、次に掲げる場合はこの限りではありません。
      </p>
      <ul className="list-disc list-inside ml-4">
        <li>
          当サイトが利用目的の達成に必要な範囲内において個人情報の取扱いの全部または一部を委託する場合（上記2.(6)のGoogle社への情報送信、上記3.のReplicate社への画像データ送信、及びログインリンク送信のためのResend社へのメール送信を含みます）
        </li>
        <li>合併その他の事由による事業の承継に伴って個人情報が提供される場合</li>
        <li>
          国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合であって、ユーザーの同意を得ることによって当該事務の遂行に支障を及ぼすおそれがある場合
        </li>
        <li>その他、個人情報保護法その他の法令で認められる場合</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-6 mb-3">5. Cookieその他の技術の利用及び外部送信について</h2>
      <p>当サイトのサービスでは、サービス品質の向上、利用状況の分析、及び広告配信のために、Cookie及びこれに類する技術を利用しています。</p>

      <h3 className="text-xl font-semibold mt-4 mb-2">(a) Google Analyticsについて</h3>
      <p>
        当サイトは、Google社が提供するアクセス解析ツール「Google Analytics」を利用しています。Google Analyticsは、Cookieを利用してユーザーのトラフィックデータを収集します。このトラフィックデータは匿名で収集されており、個人を特定するものではありません。
        ユーザーは、Google Analyticsによるデータ収集を無効にすることができます。詳細については、Google アナリティクス オプトアウト アドオンのページ（<a href="https://tools.google.com/dlpage/gaoptout?hl=ja" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://tools.google.com/dlpage/gaoptout?hl=ja</a>）をご確認ください。
      </p>
      <ul className="list-disc list-inside ml-4">
        <li>送信される情報：閲覧ページURL、IPアドレス、ユーザーエージェント、Cookie情報など</li>
        <li>送信先：Google LLC</li>
        <li>利用目的：アクセス状況の分析、サイト改善</li>
      </ul>

      <h3 className="text-xl font-semibold mt-4 mb-2">(b) Google AdSenseについて</h3>
      <p>
        当サイトは、Google社が提供する広告配信サービス「Google AdSense」を利用しています。Google AdSenseは、Cookieを利用して、ユーザーの興味に応じたパーソナライズ広告を表示することがあります。これには、ユーザーの当サイトや他のウェブサイトへのアクセス情報が含まれる場合がありますが、氏名、住所、メールアドレス、電話番号などの個人を特定できる情報は含まれません。
        ユーザーは、Googleの広告設定ページ（<a href="https://adssettings.google.com/authenticated" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://adssettings.google.com/authenticated</a>）で、パーソナライズ広告を無効にすることができます。また、<a href="http://www.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.aboutads.info</a> にアクセスすれば、パーソナライズ広告に使われる第三者配信事業者の Cookie を無効にできます。
      </p>
      <ul className="list-disc list-inside ml-4">
        <li>送信される情報：閲覧ページURL、IPアドレス、ユーザーエージェント、Cookie情報、広告の表示・クリック情報など</li>
        <li>送信先：Google LLC 及び Google AdSenseネットワーク参加の広告配信事業者</li>
        <li>利用目的：ユーザーに適した広告の表示、広告効果測定</li>
      </ul>

      <h3 className="text-xl font-semibold mt-4 mb-2">(c) Cookieの管理と無効化について</h3>
      <p>
        上記以外にも、ユーザーは、お使いのウェブブラウザの設定を変更することにより、Cookieの受け入れを拒否したり、保存されているCookieを削除したりすることができます。ただし、Cookieを無効化したり削除したりすると、当サイトのサービスの一部の機能をご利用いただけなくなる場合がありますので、あらかじめご了承ください。ブラウザの設定方法は、各ブラウザのヘルプ等でご確認ください。
      </p>
      <p className="mt-4">
        <strong>【外部送信規律に関する追記】</strong><br />
        当サイトでは、上記(a)および(b)並びに本サービス提供のため、ユーザーに関する情報を以下の外部事業者に送信しています。
      </p>
      <ul className="list-disc list-inside ml-4">
        <li>送信先事業者名：Google LLC</li>
        <li>送信される情報の内容：閲覧ページURL、IPアドレス、ユーザーエージェント、Cookie情報、広告の表示・クリック情報など</li>
        <li>送信される情報の利用目的：アクセス状況の分析、サイト改善、広告配信および広告効果測定</li>
        <li>送信先事業者名：Replicate, Inc.</li>
        <li>送信される情報の内容：アップロード画像（背景除去等の画像処理のため）</li>
        <li>送信される情報の利用目的：背景除去・画像処理の実行</li>
        <li>送信先事業者名：Resend, Inc.</li>
        <li>送信される情報の内容：メールアドレス、送信メール本文（ログインリンクを含みます）</li>
        <li>送信される情報の利用目的：ログインリンクの送信</li>
        <li>送信先事業者名：Stripe, Inc.</li>
        <li>送信される情報の内容：メールアドレス、購入/契約情報、決済に必要な情報（クレジットカード情報等はStripe社が直接取得します）</li>
        <li>送信される情報の利用目的：Proサブスクリプションの購入、請求、支払い管理、カスタマーポータルの提供</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-6 mb-3">6. 安全管理措置</h2>
      <p>当サイトは、その取り扱う利用者情報の漏えい、滅失又はき損の防止その他利用者情報の安全管理のために必要かつ適切な措置を講じます。</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">7. プライバシーポリシーの変更手続</h2>
      <p>
        当サイトは、必要に応じて、本ポリシーを変更します。但し、法令上ユーザーの同意が必要となるような本ポリシーの変更を行う場合、変更後の本ポリシーは、当サイト所定の方法で変更に同意したユーザーに対してのみ適用されるものとします。なお、当サイトは、本ポリシーを変更する場合には、変更後の本ポリシーの施行時期及び内容を当サイトのウェブサイト上での表示その他の適切な方法により周知し、またはユーザーに通知します。
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">8. お問い合わせ窓口</h2>
      <p>ご意見、ご質問、苦情のお申出その他利用者情報の取扱いに関するお問い合わせは、下記の窓口までお願いいたします。</p>
      <ul className="list-disc list-inside ml-4">
        <li>連絡先：【support@quicktools.jp】</li>
      </ul>

      <p className="mt-6">QuickTools運営</p>
    </div>
  );
} 