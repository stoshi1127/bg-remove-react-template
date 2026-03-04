## 概要

`my-bg-remover` は、ブラウザから画像をアップロードして **AIで背景透過（切り抜き）** し、必要に応じて **背景テンプレート/単色に合成** してダウンロードできる Next.js アプリです。追加ツールとして **色調整（/tone）** と **画像トリミング（/trim）** も同梱しています。

## 主な機能

- **イージーカット（`/`）**
  - 複数画像の一括アップロード（ドラッグ&ドロップ対応）
  - HEIC/HEIF を自動変換して処理
  - 背景透過（`/api/remove-bg`）
  - 出力サイズ（アスペクト比）: `1:1` / `16:9` / `4:3` / `元画像に合わせる` / `被写体にフィット`（**初期選択: 被写体にフィット**）
  - 背景のカスタマイズ（背景なし / テンプレート / カラーピッカー / 任意画像アップロード（Pro）/ なじませる機能（Pro））
  - 仕上がりモード選択（`標準` / `高精度（Pro）` / `AIで背景を作る（Pro）`）
    - `AIで背景を作る` 選択時: 専用のプロンプト・プリセット設定エリアを表示し、他の背景カスタマイズオプションを非表示化
  - **AI背景生成 / 2段階処理（Pro）**:
    - アスペクト比が `1:1` 等に指定されている場合、境界を自然にするため **「背景透過」→「カンバス拡張」→「AI背景生成」** の2段階で処理
    - `bria-ai/background-generation` モデルを使用
  - **自動高画質化（Pro）**:
    - AI背景生成後の画像が低解像度（1MP）になる仕様を補完するため、元画像が1200px以上の場合は **自動でアップスケール（Real-ESRGAN）を実行** し、高精細な合成結果を維持
  - メインアクションボタンの文言: 背景透過のみの場合は「背景を透過する」、AI背景生成や背景テンプレート選択時は「背景を合成する」へ動的に変更
  - 仕上がりモード・仕上がりのサイズ・背景の各選択後、次のセクションへ自動スクロール
  - 個別ダウンロード / ZIP一括ダウンロード（「すべてダウンロード」は結果エリアで Pro 訴求ブロックの直後に表示）
  - 処理モード選択（`標準` / `高精度（Pro）` / `AIで背景を作る`）
  - 透過処理中の進行表示はモーダルで表示（進捗・枚数・キャンセルをモーダル内で操作。`createPortal` により画面全体を確実にカバー）
  - 結果画面ের Pro 訴求（Free）: 「Proならもっときれいに」（月額780円で高精度＋プレミアムAI）ブロックを「すべてダウンロード」ボタンの前に表示し、CTA は「Proを購入する」（トップの CTA と統一）
  - 結果画面の Pro 機能: 高精度で再処理、1K/2K/4K アップスケール、アップスケール後の保存は「アップスケールを保存」
  - 広告表示（Free/ゲストのみ、結果エリアに1枠。Proは非表示）
  - 上限: **最大30枚**
  - Free: 4MB超は「無料で続ける（自動圧縮）」で継続可能（目安: 4MB/8MP）
  - Pro: 元画像のままアップロード可能（目安: 25MB/90MP、安全弁あり）
  - **料金表示**: Pro は月額 ¥780。トップの CTA セクション（`#pro`）に Free/Pro 比較表を表示。「くわしく見る」で詳細モーダル。アカウントページにも比較表と月額表示。フッターに「料金・プラン」リンク（`/#pro`）
  - **プレミアムAI残回数**: Pro会員は月30回まで。ヘッダー・アカウントページに「残り○回」表示。`PremiumUsage` テーブルでカレンダー月ごとに管理

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
- **必須（認証 / NextAuth）**: `AUTH_SECRET`（NextAuthのセッションやCSRFトークン暗号化用）
- **任意（Google連携）**: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`（Googleログインを利用する場合）
- **必須（Pro直送アップロード）**: `BLOB_READ_WRITE_TOKEN`
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
  - `REPLICATE_GENERATE_BG_VERSION`（AI背景生成モデルのバージョン/モデル指定。未指定時は `bria-ai/background-generation` のデフォルトversion）
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

### 認証（NextAuth.js マジックリンク & Googleログイン）

NextAuth.js (Auth.js v5) を使用した 2 種類のログイン方法を提供しています。

1. **マジックリンク（パスワードレス）**
   - セキュリティ対策として、**事前にデータベースに存在するユーザー（Pro購入済みユーザー）のみ**がログイン可能です。未登録のアドレスを入力してもメールは送信されません。
   - `/login` からメールアドレスを入力して送信し、届いたメールのリンクをクリックしてログインします。

2. **Googleログイン（OAuth）**
   - 既存ユーザーのログインに加え、**未登録ユーザーの新規アカウント作成（Freeプラン）**にも対応しています。
   - Google認証が完了すると、即座にセッションが開始されます。

### 課金（Stripe / Proサブスク）

- `POST /api/billing/checkout`
  - ログイン済みのユーザー向けに、Stripe Checkoutを開始し `{ ok: true, url }` を返します。
- `GET /api/billing/checkout` [NEW]
  - Googleログイン完了後のリダイレクト先として機能し、ユーザーを自動的にStripe決済画面へ転送します。
- `POST /api/billing/guest-checkout`
  - ログイン不要。メールアドレスを入力して購入を開始します（決済完了後にアカウントが作成されます）。
- `POST /api/billing/portal`
  - ログイン必須。Stripeのカスタマーポータルを開くためのURLを返します。
- `POST /api/billing/webhook`
  - Stripeからのイベントを受け取り、DBのプラン情報を同期します。
- `GET /billing/success?session_id=...`
  - 決済成功後の戻り先。購入情報を反映し、`/account` へリダイレクトします。

---

#### Googleログインを活用したスムーズな購入フロー
Pro購入モーダルで「Googleアカウントで登録・購入」を選択すると、Googleログイン完了後に自動で Stripe 決済画面へリダイレクトされる導線を実装しています。これにより、手動のメールアドレス入力をスキップして最短で決済を完了できます。

### プレミアムAI使用回数（Pro会員）

- `GET /api/premium-usage`
  - ログイン必須。Pro会員のプレミアムAI残回数を返します。`{ available: true, used, remaining, limit: 30, yearMonth }` または `{ available: false }`
- `POST /api/premium-usage/consume`
  - ログイン必須。プレミアムAI使用回数を1消費します。Body: `{ feature?: string }`（将来の計測用）。残り0の場合は 403

### `POST /api/ai/generate-background`

Pro専用のAI背景生成・合成です。被写体を保ちながら、指定した背景のイメージをAIが自然に生成します。プレミアムAI回数を1回消費します。

フロントエンド側では「背景をカスタマイズ」セクション内で事前に設定し、処理開始ボタンで複数ファイルに一括適用します（ファイル数×1回消費）。
- **アスペクト比対応（2段階処理）**:
  - `selectedRatio` が `original` 以外の場合、クライアント側で **「背景除去」→「パディング」→「AI生成」** の順でAPIを連続実行します。これによりAIが透明部分全体を描き変えるため、選択比率で境界のない自然な合成が可能になります。
- **自動解像度復元**:
  - `bria-ai/background-generation` の出力解像度は約1MPに制限されるため、元画像が1200pxを超える場合は生成後に自動で **Real-ESRGAN（くっきり高画質）** を適用し、元の精細さを復元します。

- **Runtime**: Node.js（maxDuration: 90s）
- **認証**: ログイン済みかつ `isPro=true` のみ許可。プレミアムAI残回数 > 0 が必要
- **Request（application/json）**:
  - `imageUrl`: 元画像のURL（Blob等、推奨。Vercel 4.5MB制限回避のためフロントはBlobへ直接アップロード）
  - `imageDataUrl`: 元画像（Data URL）。`imageUrl` がない場合のフォールバック
  - `mode`: `'generate'`（テキストから背景生成）または `'blend'`（参照画像になじませる）
  - `prompt`: 背景の説明テキスト（generate時に使用）
  - `refImageUrl`: 参照背景画像のURL（blend時、推奨）
  - `refImageDataUrl`: 参照背景画像（Data URL、blend時。小さい場合のみ。`refImageUrl` がない場合のフォールバック）
- **Response**:
  - 成功時: `200` + 画像バイナリ。ヘッダー `x-premium-remaining` で残回数を返却
  - 失敗時: `4xx/5xx` + JSON `{ error: string }`。失敗時は回数を消費しない

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
