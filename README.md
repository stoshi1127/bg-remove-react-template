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
- **推奨**: `NEXT_PUBLIC_SITE_URL`（OGP/ログインリンク生成用。未設定の場合は `http://localhost:3000` を使用）
- **推奨**: `AUTH_SECRET`（将来の拡張用。現状はセッションをDBで管理）

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

## 簡易テスト（任意）

ローカルで `pnpm dev` を起動した状態で、以下のスクリプトでAPIの疎通確認ができます。

```bash
bash scripts/dev-test.sh
```

## プライバシー/データ取り扱い

画像は処理のために外部API（Replicate）へ送信されます。詳細はアプリ内のプライバシーポリシーをご確認ください。

- `src/app/privacy-policy/page.tsx`
