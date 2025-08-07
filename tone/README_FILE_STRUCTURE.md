# EasyTone ファイル構造について

## 重要な注意事項

このプロジェクトでは、実際に使用されているコンポーネントファイルは以下の場所にあります：

### 実際に使用されているファイル（本番環境）
```
bg-remove-react-template/src/components/tone/
├── EasyToneApp.tsx          # メインアプリケーションコンポーネント
├── ImageUploader.tsx        # 画像アップロード機能
├── PresetSelector.tsx       # プリセット選択機能（複数画像対応済み）
├── ImageProcessor.tsx       # 画像処理機能
└── ResultViewer.tsx         # 結果表示機能
```

### 残存する開発・テスト用ファイル
```
tone/src/components/
├── PresetImagePreview.tsx   # 高度なプレビュー機能の実装例（参考用）
├── PresetPreview.tsx        # 単一プレビュー機能（参考用）
├── ErrorBoundary.tsx        # エラーハンドリング（共通機能）
├── Notification.tsx         # 通知機能（共通機能）
└── その他の共通コンポーネント
```

### 削除されたファイル（2024年8月7日）
誤解を防ぐため、以下のファイルを削除しました：
- `tone/src/components/EasyToneApp.tsx` - 実際に使用されていない重複実装
- `tone/src/components/PresetSelector.tsx` - 実際に使用されていない重複実装
- `tone/src/components/ImageUploader.tsx` - 実際に使用されていない重複実装
- `tone/src/components/ImageProcessor.tsx` - 実際に使用されていない重複実装
- `tone/src/components/ResultViewer.tsx` - 実際に使用されていない重複実装
- `tone/src/components/WorkflowContainer.tsx` - 使用されていないワークフロー機能
- `tone/src/components/WorkflowSteps.tsx` - 使用されていないワークフロー機能
- 関連するCSSファイル、テストファイル、hooks、types、utils、workers

## 修正履歴

### 複数画像表示問題の解決
- **問題**: 複数画像をアップロードしても1枚しか表示されない
- **原因**: `bg-remove-react-template`内のPresetSelectorが単一画像のみ対応していた
- **解決**: PresetSelectorを複数画像対応に修正

### 修正内容
1. `PresetSelector`のpropsを`previewImage`から`previewImages`に変更
2. 複数画像をグリッドレイアウトで表示するUI実装
3. レスポンシブデザイン対応
4. デバッグ表示の削除とコードクリーンアップ

## 今後の開発について

新機能の追加や修正を行う際は、必ず`bg-remove-react-template/src/components/tone/`内のファイルを編集してください。

`tone/src/`内のファイルは参考実装として保持していますが、実際のアプリケーションには影響しません。