# DOM入れ子エラー（Hydration Error）の修正計画

`BgRemover.tsx` において、`<p>` タグの内部に `<div>` タグが含まれている箇所があり、これが原因で React のハイドレーションエラー（`In HTML, <div> cannot be a descendant of <p>`）が発生しています。この構造を有効なHTML構造に修正します。

## 提案される変更

### Frontend

#### [MODIFY] [BgRemover.tsx](file:///Users/shinkai/my-bg-remover/src/components/BgRemover.tsx)

- 2775行目付近の `<p>` タグを `<div>` タグに変更します。
- 閉じタグ（2826行目付近）も `</div>` に変更します。

## 確認計画

### 手動確認
- 開発サーバー (`npm run dev`) を実行し、ブラウザのコンソールでハイドレーションエラー（`validateDOMNesting`）が消えていることを確認する。
- ファイルアップロード時のステータス表示（「写真を準備中...」「アップロード中...」など）の見た目が崩れていないか確認する。
