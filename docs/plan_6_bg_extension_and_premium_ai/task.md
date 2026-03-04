# タスクリスト（Plan 6 改修：AI背景フロー再設計）

## State / ロジック
- [x] `bgMode`, `blendEnabled` state追加
- [x] bgMode切り替えロジック（AIプリセット選択↔通常テンプレ選択）
- [x] `handleRemove` に `ai_generate` / `blend` 分岐追加
- [x] 複数ファイル対応：全件にAI処理 + 回数消費
- [x] 残回数事前チェック（ファイル数 vs 残回数）

## UI
- [x] 背景カスタマイズ内に「AIで背景を作る」を目立つカードとして配置
- [x] 「自然になじませる」チェックボックス追加（デフォルトOFF、Pro限定）
- [x] 処理開始ボタンにAI回数表示
- [x] 旧UI削除（完了後トリガーのAI生成/blend セクション）

## 旧ハンドラ削除
- [x] `handleAiBgGenerate` 削除
- [x] `handleBlend` 削除

## ドキュメント
- [x] task.md 更新
- [ ] README.md 更新
- [ ] walkthrough.md 更新
