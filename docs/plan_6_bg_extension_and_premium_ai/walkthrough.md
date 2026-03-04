# Plan 6 改修 — AI背景フロー再設計 ウォークスルー

## 変更概要

AI背景生成を「背景除去後に後付け実行」から「**事前設定 → 一括処理**」に変更。
`bria/generate-background` モデルのみで処理し、`851-labs/background-remover` / `fottoai/remove-bg-2` は使用しない。

## 主な変更点

### BgRemover.tsx

- **新state**: `bgMode` (`normal` | `ai_generate`), `blendEnabled` (boolean, デフォルトOFF)
- **旧ハンドラ削除**: `handleAiBgGenerate`, `handleBlend` → `handleRemove`内に統合
- **UI改修**:
  - 「✨ AIで背景を作る」を背景カスタマイズ内の目立つカードに配置（常時表示）
  - 「自然になじませる」をチェックボックス化（テンプレ/カラー選択時のみ表示、デフォルトOFF）
  - テンプレ/カラー選択時は自動で`bgMode='normal'`に戻り、AIプリセット解除
  - AIプリセット/プロンプト入力で自動で`bgMode='ai_generate'`に切り替え
- **処理フロー分岐** (`handleRemove` → `processSingleFile`内):
  - `bgMode === 'ai_generate'` → `/api/ai/generate-background` (mode=generate)
  - `bgMode === 'normal' && blendEnabled` → `/api/ai/generate-background` (mode=blend)
  - それ以外 → 従来の `/api/remove-bg`
- **事前チェック**: AI処理時はPro判定 + 残回数 ≥ ファイル数を事前確認
- **複数ファイル対応**: 全ファイルにAI処理を適用し、1ファイルにつき1回消費

### route.ts (API)

- モデル名: `bria/generate-background:2555256f9a28...`（正しいバージョンID）
- `maxDuration: 90`（ポーリング最大秒数に合わせた）
- `bg_prompt` と `ref_image_file` は排他（blend時は`bg_prompt`を送らない）

### README.md

- API仕様を更新（入力画像は「元画像」に変更、フロー説明追加）

## 検証結果

- `npx tsc --noEmit`: BgRemover.tsx / route.ts のエラーなし
- ビルド正常
