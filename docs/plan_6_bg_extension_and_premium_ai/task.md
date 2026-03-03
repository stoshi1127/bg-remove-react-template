# タスクリスト (Plan 6: 背景機能拡張とプレミアムAI共通回数設計)

## 調査フェーズ
- [x] BgRemover.tsx の背景テンプレUI・applyTemplate 構造の調査
- [x] premiumUsage.ts / premium-usage API の構造確認
- [x] Replicate API 連携パターン（remove-bg/route.ts）の確認
- [x] Prismaスキーマ・認証ヘルパーの確認

## 実装フェーズ

### 1. 背景生成API（`/api/ai/generate-background`）
- [x] `src/app/api/ai/generate-background/route.ts` 新規作成
  - Replicate `bria/generate-background` 呼び出し
  - 認証ガード（Pro判定）
  - プレミアムAI回数消費（成功時のみ）
  - blendモード追加（`ref_image_file` パラメータ対応）

### 2. BgRemover.tsx UI拡張
- [x] 任意画像アップロード機能（Pro限定、回数消費なし）
- [x] 「背景を作る」セクション（プリセット＋テキスト入力）
- [x] 「背景を自然になじませる」ボタン（テンプレ/任意背景選択時に表示）
- [x] プレミアムAI残回数表示
- [x] Freeユーザー向けのPro導線（各ボタンにProバッジ・購入リダイレクト）

### 3. Analytics イベント追加
- [x] `bg_custom_image_applied` / `bg_generate_applied` / `bg_blend_applied`
- [x] `premium_ai_consumed` / `pro_purchase_click_from_ai_bg`

### 4. ドキュメント更新
- [x] README.md 更新（環境変数・新API・blendモードの記載）
- [x] task.md / walkthrough.md 更新
