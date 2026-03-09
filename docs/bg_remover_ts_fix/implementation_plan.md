# 背景除去コンポーネントのTypeScriptエラー修正計画

`BgRemover.tsx` において、進捗表示計算のためのフィルタ条件で発生している型エラーを修正します。

## 修正が必要な箇所
`inputs.filter(i => i.status !== 'ready' || i.status === 'uploading' || ...)` という式において、`i.status !== 'ready'` が偽の場合（つまり `i.status === 'ready'` の場合）、TypeScriptは後続の `||` 右辺で `i.status` を `'ready'` 型と見なします。そのため、`'ready' === 'uploading'` という比較が発生し、「型が重複していない」というエラーになります。

実際には `i.status !== 'ready'` だけで「準備中」以外のすべてのステータス（アップロード中、処理中、完了、エラー）を包含できるため、冗長な条件を削除することで解決します。

## Proposed Changes

### BgRemover
Summary: 進捗計算ロジックの修正。

#### [MODIFY] [BgRemover.tsx](file:///Users/shinkai/my-bg-remover/src/components/BgRemover.tsx)
- 3297行目付近の `totalFiles` 計算式を簡略化する。

## Verification Plan

### Automated Tests
- `npm run build` を実行し、当該ファイルで TypeScript エラーが発生しないことを確認します。

### Manual Verification
- ローカル環境で `npm run dev` を実行し、複数ファイルをアップロードして背景除去を実行した際に進捗モーダルが正常に表示されることを確認します。
