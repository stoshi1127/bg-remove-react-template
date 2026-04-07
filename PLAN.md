# Vercel Fast Origin Transfer 削減プラン

## Summary
`Fast Origin Transfer` の主因は、画像を Vercel Functions に送信し、さらに Functions から画像 blob を返している現行フローです。実装方針は次で固定します。

- 処理後画像は Functions から中継せず、Vercel Blob に保存して URL を返す
- 入力画像は Free/Pro とも Blob client upload を標準経路にする
- `/trim` 連携は Data URL 前提をやめ、画像 URL 前提に切り替える
- ロールアウトは段階切替にし、新旧レスポンス契約はリクエスト単位で共存させる

固定した判断:
- 出力 Blob の保持は `72時間`
- `72時間` を公開仕様にするため、v1 に定期削除ジョブを含める
- 新旧レスポンス契約の切替は `X-Image-Response-Mode: url|blob` に一本化する
- ゲスト/Free の upload token 制限は Redis は使わず、簡易制限で入れる

## Implementation Changes
### 1. 画像処理 API を URL レスポンスへ変更
対象は `/api/remove-bg`, `/api/ai/generate-background`, `/api/enhance`。

- Replicate 出力をそのままレスポンスに流すのをやめ、サーバ側で Vercel Blob に保存して JSON を返す
- 成功レスポンスは以下で統一する  
  `{"ok": true, "outputUrl": string, "contentType": string, "processingMode"?: string, "premiumRemaining"?: number}`
- 互換期間中は `X-Image-Response-Mode=blob` のときだけ旧 blob レスポンスを返す
- 入力用の一時 Blob は処理完了後に削除する
- 出力 Blob は `processed/yyyy-mm-dd/...` 配下に保存し、後続削除ジョブで日付 prefix を走査しやすい構造にする

### 2. 出力 Blob の 72時間保持を v1 に含める
- Vercel Cron で 1日1回以上動く削除エンドポイントを追加する
- 削除対象は `processed/` 配下のうち、作成時刻または日付 prefix から `72時間` 超過と判定できるものに限定する
- 削除ジョブは dry-run ログを出せるようにし、初回デプロイ時は監視しやすくする
- `README.md` と `src/app/privacy-policy/page.tsx` に「入力画像と処理後画像の一時保存」「保存期間 72時間」を明記する

### 3. クライアントを URL 前提へ変更
対象の中心は [BgRemover.tsx](/Users/shinkai/my-bg-remover/src/components/BgRemover.tsx) と [src/app/trim/page.tsx](/Users/shinkai/my-bg-remover/src/app/trim/page.tsx)。

- 背景除去・AI 背景・高画質化の各 fetch 後は JSON を読み、`outputUrl` を state に保持する
- `outputUrl` / `highQualityOutputUrl` / `standardOutputUrl` は URL を正とし、Data URL 前提のコメントや分岐を整理する
- 画面表示・保存リンク・ZIP 化は URL を直接使う
- canvas 処理が必要な箇所だけ、その場で `fetch(url) -> Blob` にする
- `runEnhance` は `imageDataUrl` をやめ、Blob URL 入力へ変更する
- `/trim` 連携は `localStorage.trimImage` に URL を保存し、trim 側は URL をそのまま読み込む
- trim 側の canvas 処理は `crossOrigin = "anonymous"` を前提にし、Vercel Blob URL で taint しないことを確認する
- 互換期間中は `Content-Type` を見て JSON/blob の両方を読めるクライアント互換レイヤを持つ

### 4. 全ユーザーの Blob client upload 化
対象の中心は [src/app/api/upload/blob/route.ts](/Users/shinkai/my-bg-remover/src/app/api/upload/blob/route.ts)。

- Pro 限定の upload token 発行をやめ、Free/Pro とも token 発行可能にする
- 上限は現行ポリシーを維持する  
  Free: 既存の圧縮後サイズ・MP 制限  
  Pro: `NEXT_PUBLIC_PRO_MAX_UPLOAD_MB` など既存上限
- クライアントはプランに関係なく `imageUrl` / `refImageUrl` を API に渡す
- multipart と data URL は互換期間だけ残し、最終的には縮退経路にする
- `remove-bg` の URL 失敗時 Data URI フォールバックは `url` モードでは無効化する
- upload token 発行 API は `uploads/inputs/` 配下に固定し、画像 MIME のみ許可する

### 5. 簡易レート制限を v1 に含める
Redis などの共有ストアは追加しない前提で、best-effort の簡易制限に固定する。

- token 発行 API で `user.id` がある場合は `user.id` を識別子に使う
- ゲスト時は `IP + User-Agent` のハッシュを識別子に使う
- 短時間クールダウン用の `HttpOnly` cookie を発行し、同一ブラウザからの連打を抑止する
- 制限値は `10分で10回`、超過時は `429` を返す
- ログには `plan`, `isAuthenticated`, `identifierType`, `limited` を残す
- この制限は分散環境で厳密ではないため、将来 Redis 制限へ差し替え可能な薄い関数に切り出す

## Public API / Interface Changes
- `/api/remove-bg` 成功レスポンス: blob または JSON。新契約は JSON
- `/api/ai/generate-background` 成功レスポンス: blob または JSON。新契約は JSON
- `/api/enhance` 成功レスポンス: blob または JSON。新契約は JSON
- レスポンス切替は `X-Image-Response-Mode: url|blob`
- 維持する入力項目:
  - `imageUrl`, `sourceBlobUrl`, `refImageUrl`, `sourceRefBlobUrl`
- 縮退対象:
  - `file` multipart
  - `imageDataUrl` / `refImageDataUrl`

## Test Plan
- `url` モードで 3 API が JSON を返し、`outputUrl` が有効な Blob URL になる
- `blob` モードで旧クライアント契約が壊れない
- 古いタブを開いたままでも旧契約で正常動作する
- Free/Pro の両方で upload token 発行が通り、サイズ上限が現行どおり効く
- token 発行 API で `10分10回` 制限と `429` が効く
- 背景除去、AI 背景、ブレンド、高画質化、保存、ZIP ダウンロードが壊れない
- `/trim` 連携で URL 保存から画像表示、crop、PNG 出力まで動く
- Cron 削除ジョブが `72時間` 超過の Blob だけを削除する
- Vercel Observability で `Outgoing Fast Origin Transfer` が低下し、Blob storage/request 増加を併せて監視する

## Assumptions / Defaults
- `72時間保持` は公開仕様であり、v1 に Cron 削除を含める
- 出力画像は Replicate 直 URL ではなく Vercel Blob URL を返す
- 入力は全ユーザーで Blob client upload を標準経路にする
- ロールアウトは `NEXT_PUBLIC_IMAGE_API_MODE` と `X-Image-Response-Mode` を併用する
- 簡易レート制限は best-effort で、厳密制御が必要になったら Redis へ差し替える
- 最終形は「API は JSON で URL を返す」「Functions は画像を中継しない」構成に統一する
