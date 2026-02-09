## 概要

`my-bg-remover` は、ブラウザから画像をアップロードして **AIで背景透過（切り抜き）** し、必要に応じて **背景テンプレート/単色に合成** してダウンロードできる Next.js アプリです。追加ツールとして **色調整（/tone）** と **画像トリミング（/trim）** も同梱しています。

## 主な機能

- **イージーカット（`/`）**
  - 複数画像の一括アップロード（ドラッグ&ドロップ対応）
  - HEIC/HEIF を自動変換して処理
  - 背景透過（`/api/remove-bg`）
  - 出力サイズ（アスペクト比）: `1:1` / `16:9` / `4:3` / `元画像に合わせる` / `被写体にフィット`
  - 背景のカスタマイズ（背景なし / テンプレート / カラーピッカー）
  - 個別ダウンロード / ZIP一括ダウンロード
  - 上限: **最大30枚**、**1ファイルあたり約4MBまで**（Edge Functionのリクエストボディ制限）

- **イージートーン（`/tone`）**
  - 写真の色調整（色調補正）を3ステップで実行
  - 複数画像の一括処理に対応
  - 上限: **最大ファイルサイズ 10MB**

- **イージートリミング（`/trim`）**
  - 画像をトリミング（比率プリセット + カスタム比率）
  - PNGとしてダウンロード
  - `/` 側の「イージートリミングで編集」導線から、画像とバウンディングボックスを引き継ぎ可能（localStorage経由）

## 必要要件

- Node.js（LTS 推奨）
- pnpm

## セットアップ

依存関係をインストールします。

```bash
pnpm install
```

### 環境変数

背景透過・会員ログインには環境変数の設定が必要です。

- **必須（背景透過）**: `REPLICATE_API_TOKEN`
- **必須（会員ログイン）**: `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `RESEND_API_KEY`, `EMAIL_FROM`
- **必須（Pro課金 / Stripe）**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PRO_TEST`（本番は `STRIPE_PRICE_ID_PRO_LIVE`）
- **推奨**: `NEXT_PUBLIC_SITE_URL`（OGP/ログインリンク生成用。未設定の場合は `http://localhost:3000` を使用）
- **推奨**: `AUTH_SECRET`（将来の拡張用。現状はセッションをDBで管理）
- **任意**: `BILLING_ENABLED`（課金導線の一括OFF。ロールバック用）, `STRIPE_MODE`（未指定時は `STRIPE_SECRET_KEY` のprefixから推定）

#### `.env` の作成

```bash
cp .env.example .env
```

`.env` を開き、各値を自分の環境に合わせて設定します（Neon/Resendのキー等）。

> 注意: `.env` はコミットしないでください（`.gitignore` で除外されています）。

### DB（Neon）セットアップ

ローカルでマイグレーションを適用します（`POSTGRES_URL_NON_POOLING` が必須です）。

```bash
pnpm db:generate
pnpm db:migrate
```

## 起動

開発サーバーを起動します。

```bash
pnpm dev
```

ブラウザで `http://localhost:3000` を開きます。

## ビルド（本番）

```bash
pnpm build
pnpm start
```

## API 仕様

### `POST /api/remove-bg`

アップロードされた画像を Replicate のモデル（`cjwbw/rembg` の固定 version）で処理し、**PNG（背景透過）** を返します。

- **Runtime**: Edge（`export const runtime = 'edge'`）
- **Request**: `multipart/form-data`
  - **field**: `file`（画像ファイル）
- **Response**:
  - 成功時: `200` + `image/png`（バイナリ）
  - 失敗時: `4xx/5xx` + JSON `{ error: string }`
- **制限**: Edge Function の制約により、**1ファイルあたり約4MB** を超えるとクライアント側でエラー扱いになります。

#### curl 例

```bash
curl -X POST -F "file=@./test.jpg" "http://localhost:3000/api/remove-bg" --output out.png
```

### 認証（マジックリンク）

- `POST /api/auth/request-link`
  - 入力: JSON `{ "email": "you@example.com" }`
  - 出力: `200`（アカウント有無は返しません）
- `GET /auth/callback?token=...`
  - マジックリンク着地。成功時はセッションCookieを設定して `/account` へリダイレクト
- `POST /api/auth/logout`
  - セッションを失効してCookieを削除します

### 課金（Stripe / Proサブスク）

- `POST /api/billing/checkout`
  - ログイン必須。Pro購読のCheckoutを開始し `{ ok: true, url }` を返します
  - 既に有効購読がある場合は二重課金防止のためPortalへ誘導し `{ ok: true, kind: 'portal', url }` を返します
- `POST /api/billing/guest-checkout`
  - ログイン不要。購入時にメールアドレスを入力してCheckoutを開始します（このタイミングでユーザーが作成されます）
- `POST /api/billing/portal`
  - ログイン必須。Customer Portalを開くための `{ ok: true, url }` を返します
- `POST /api/billing/webhook`
  - Stripe Webhook受け口。署名検証＋冪等性（event.id）でDBへ同期します
- `GET /billing/success?session_id=...`
  - Checkout成功後の戻り先。購入完了を確認し、自動ログインして `/account` へリダイレクトします

#### Webhook（ローカル検証の例）

Stripe CLI を使い、ローカルへWebhookを転送します。

```bash
stripe listen --forward-to http://localhost:3000/api/billing/webhook
```

表示された `whsec_...` を `STRIPE_WEBHOOK_SECRET` に設定してください。

テストの流れ（最小）:

- `/login` でログイン → `/account` の「Proを購入する」からCheckoutへ
- 決済完了後に `/account` へ戻り、プラン表示が `Pro` になること
- 同じユーザーで再度「Proを購入する」を押した時、二重課金にならずPortalへ誘導されること
- `stripe events resend <event_id> --webhook-endpoint <id>`（またはDashboardの再送）で同一eventを再送してもDBが壊れないこと（冪等性）

#### テスト→本番移行の注意（モード混在防止）

- **Price IDはモードごとに別**です（`STRIPE_PRICE_ID_PRO_TEST` / `STRIPE_PRICE_ID_PRO_LIVE`）。
- `STRIPE_MODE` は任意です。未設定の場合は `STRIPE_SECRET_KEY` の `sk_test_` / `sk_live_` から推定します。
- 既存ユーザーに紐づく `StripeCustomer/StripeSubscription` には `stripeMode` を保存しており、モード不一致（testのCustomerをliveで参照等）はAPI側で拒否します。

#### ロールバック（緊急停止）

課金導線を一括で止めたい場合は `BILLING_ENABLED=false` を設定してください（購入/管理ボタンは非表示、`/api/billing/*` は 403 を返します）。

## 簡易テスト（任意）

ローカルで `pnpm dev` を起動した状態で、以下のスクリプトでAPIの疎通確認ができます。

```bash
bash scripts/dev-test.sh
```

## プライバシー/データ取り扱い

画像は処理のために外部API（Replicate）へ送信されます。詳細はアプリ内のプライバシーポリシーをご確認ください。

- `src/app/privacy-policy/page.tsx`
