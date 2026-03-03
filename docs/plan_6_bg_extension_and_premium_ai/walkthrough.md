# 修正内容の確認 (Walkthrough)

## 変更の概要

Plan 6 に基づき、背景機能拡張とプレミアムAI連携を **全フェーズ完了** しました。

## 新規ファイル

### `src/app/api/ai/generate-background/route.ts`
- `bria-ai/background-generation` モデルを Replicate API 経由で呼び出す POST エンドポイント
- **2つのモード**:
  - `generate`: テキスト（プリセット＋ユーザー入力）から背景を生成
  - `blend`: 参照画像（テンプレ/任意背景）の雰囲気で背景を再生成し、光源・色調を自然に調和
- Pro会員チェック → プレミアムAI残回数チェック → Replicate呼び出し → **成功時のみ回数消費** → 画像バイナリ返却

## 変更ファイル

### `src/components/BgRemover.tsx`
- **新規state**: `customBgImage`, `aiBgPrompt`, `aiBgPreset`, `aiBgBusy`, `aiBgError`, `blendBusy`, `premiumRemaining`, `customBgInputRef`
- **プレミアムAI残回数の自動取得**: Pro会員はマウント時に `/api/premium-usage` を呼び残回数を取得
- **任意画像アップロード**（Pro限定・回数消費なし）: テンプレグリッドの末尾に「画像を背景に」ボタンを追加
- **AI背景生成セクション**: 6プリセット＋テキスト入力 → `/api/ai/generate-background` (mode=generate)
- **「自然になじませる」ボタン**: テンプレ/任意背景選択時に表示 → `/api/ai/generate-background` (mode=blend)
- **Analytics**: `bg_custom_image_applied`, `bg_generate_applied`, `bg_blend_applied`, `premium_ai_consumed`, `pro_purchase_click_from_ai_bg`

### `README.md`
- 機能一覧に「任意画像アップロード（Pro）」「AIで背景を作る」「背景を自然になじませる」を追記
- 環境変数に `REPLICATE_GENERATE_BG_VERSION` を追記
- API仕様に `POST /api/ai/generate-background` を追記（generateモード/blendモードの両方を記載）

## 検証結果

- `npx tsc --noEmit` — 新コードに起因するエラーなし
- `git status` — 意図した変更のみ（一時ファイルやダミーコード残存なし）

## トラブルシューティング（2026-03-03 追記）

- **AI処理の開始に失敗する（502）エラーの修正**: Replicate `bria-ai/background-generation` モデル入力のパラメータ名が仕様変更・間違いだったため (`prompt` → `bg_prompt`)、修正を行い正常に要求が開始されるようにしました。無効な `refine_prompt` パラメータ入力も削除しています。
- ※Consoleに出る `ERR_BLOCKED_BY_RESPONSE...Coep` (vercel.live) は Vercel開発ツールの制約によるもので、アプリケーション動作には影響しません。
