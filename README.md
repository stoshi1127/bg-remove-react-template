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
  - 処理モード選択（`標準（速い）` / `高精度（Pro）`）
  - 結果画面のPro改善ブロック（Free: `Proプランでできること` を表示 / Pro: `高精度で再処理` と `1K/2K/4K`、全件一括アップスケール）
  - 広告表示（Free/ゲストのみ、結果エリアに1枠。Proは非表示）
  - 上限: **最大30枚**
  - Free: 4MB超は「無料で続ける（自動圧縮）」で継続可能（目安: 4MB/8MP）
  - Pro: 元画像のままアップロード可能（目安: 25MB/90MP、安全弁あり）

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
- **必須（Pro直送アップロード）**: `BLOB_READ_WRITE_TOKEN`
- **推奨**: `NEXT_PUBLIC_SITE_URL`（OGP/ログインリンク生成用。未設定の場合は `http://localhost:3000` を使用）
- **必須（ゲスト購入）**: `AUTH_SECRET`（ゲスト購入時の一時データ（`PendingCheckout`）を暗号化して保存するため）
- **任意**: `BILLING_ENABLED`（課金導線の一括OFF。ロールバック用）, `STRIPE_MODE`（未指定時は `STRIPE_SECRET_KEY` のprefixから推定）
- **任意（アップロード制御）**:
  - `UPLOAD_DIRECT_ENABLED` / `NEXT_PUBLIC_UPLOAD_DIRECT_ENABLED`（Proの直送経路ON/OFF）
  - `PRO_MAX_UPLOAD_MB` / `NEXT_PUBLIC_PRO_MAX_UPLOAD_MB`（Proサイズ上限、既定25）
  - `PRO_MAX_MP` / `NEXT_PUBLIC_PRO_MAX_MP`（Proメガピクセル上限、既定90）
  - `PRO_MAX_SIDE_PX` / `NEXT_PUBLIC_PRO_MAX_SIDE_PX`（長辺上限、既定10000）
  - `FREE_MAX_MP` / `NEXT_PUBLIC_FREE_MAX_MP`（Freeメガピクセル上限、既定8）
  - `NEXT_PUBLIC_FREE_OUTPUT_MAX_SIDE_PX`（Free最終出力の長辺上限、既定3200）
  - `NEXT_PUBLIC_PRO_OUTPUT_MAX_SIDE_PX`（Pro最終出力の長辺上限、既定7000）
- **任意（モデルバージョン固定）**:
  - `REPLICATE_REMOVE_BG_2_VERSION`（高精度透過モデルのバージョン/モデル指定）
  - `REPLICATE_REAL_ESRGAN_VERSION`（くっきり高画質モデルのバージョン/モデル指定）
- **任意（広告表示）**:
  - `NEXT_PUBLIC_ADS_ENABLED`（`false` で広告枠を非表示）
  - `NEXT_PUBLIC_AD_PLACEMENT`（`after_cta` または `bottom`、未指定時は `after_cta`）
  - `NEXT_PUBLIC_AD_RESULT_URL`（広告リンク先URL）
  - `NEXT_PUBLIC_AD_RESULT_TITLE` / `NEXT_PUBLIC_AD_RESULT_DESCRIPTION` / `NEXT_PUBLIC_AD_RESULT_CTA_LABEL`（広告枠文言の上書き）
  - 注意: 本リポジトリは `Cross-Origin-Embedder-Policy: require-corp` を有効化しています。第三者広告スクリプトを導入する場合は配信可否を事前検証してください。

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

アップロードされた画像を Replicate で処理し、**PNG（背景透過）** を返します。
- 標準: `851-labs/background-remover`（固定version）
- 高精度（Proのみ）: `fottoai/remove-bg-2`（固定versionまたは環境変数指定）

- **Runtime**: Node.js（`export const runtime = 'nodejs'`）
- **Request**:
  - `multipart/form-data`（Free/既存互換）:
    - **field**: `file`（画像ファイル）
    - **field**: `processingMode`（任意。`standard` / `pro_high_precision`）
  - `application/json`（Pro直送）:
    - **field**: `imageUrl`（オブジェクトストレージ上の一時URL）
    - **field**: `sourceBlobUrl`（処理後に削除する一時URL）
    - **field**: `processingMode`（任意。`standard` / `pro_high_precision`）
- **Response**:
  - 成功時: `200` + `image/png`（バイナリ）
  - 失敗時: `4xx/5xx` + JSON `{ error: string }`
- **制限**:
  - Freeは4MB超を選択しても、クライアント側で自動圧縮して継続できます
  - Proは直送アップロードにより、巨大ボディをFunctionへ送らない経路で処理します
  - `processingMode=pro_high_precision` は **Pro会員のみ**（サーバー側で403ガード）

### `POST /api/enhance`

Pro専用の「くっきり高画質に」処理です。内部で `nightmareai/real-esrgan` を使い、UIは `1K / 2K / 4K` を提供します。

- **Runtime**: Node.js
- **認証**: ログイン済みかつ `isPro=true` のみ許可
- **Request（application/json）**:
  - `imageDataUrl`: 入力画像（Data URL）
  - `scale`: `2` または `4`（UI非表示・内部決定）
- **Response**:
  - 成功時: `200` + `image/png`
  - 失敗時: `4xx/5xx` + JSON `{ error: string }`
- **処理方針**:
  - 入力は長辺1440px以下に正規化
  - 目標出力は 1K/2K/4K（長辺1024/2048/3840）に最終リサイズ

### `POST /api/upload/blob`

Pro向けの直送アップロード用トークンを発行します（Vercel Blobのclient upload）。

- **Runtime**: Node.js
- **認証**: ログイン済みかつ `isPro=true` のみ許可
- **用途**: ブラウザからオブジェクトストレージへ直接アップロードし、Function/Edgeに巨大バイナリを通さない

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
  - ログイン不要。購入時にメールアドレスを入力してCheckoutを開始します（**決済完了後**にユーザー（会員）が作成されます）
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

Free/ゲスト向け広告を表示する場合、広告表示・クリックに関する情報が計測されることがあります（Google Analytics / Google AdSense の利用方針を含む）。

- `src/app/privacy-policy/page.tsx`
