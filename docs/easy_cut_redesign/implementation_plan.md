# Goal Description

Stitchで作成された新しいデザイン（「イージーカット - アイコン・レイアウト改善版」）を既存のトップページ（`src/app/page.tsx` および `src/components/BgRemover.tsx`）に反映させる。

## 適用範囲に関する回答と修正方針

1. **ヘッダーとフッターの適用範囲**: 
   既存のナビゲーション名（イージーカット、イージートーン、イージートリミング）はそのまま維持します。
2. **Tailwind設定の拡張**: 
   新しいデザインで使われている色（`primary: #2b6cee`, `pro-orange: #f97316` など）は `tailwind.config.ts` に追加し、新規コンポーネントのみに適用します。
3. **トップページ反映範囲の限定**:
   Stitchデザインがトップページ全体を網羅していないため、改修の対象は**「ヘッダー」から「アップロードエリア」まで**とします。それ以下の機能紹介やFAQセクションなどは既存のものを維持します。

## Proposed Changes

### Configuration
#### [MODIFY] tailwind.config.ts
- `primary`, `pro-orange`, `background-light`, `background-dark` 等のカスタムカラーとフォント設定を追加。

### Components
#### [MODIFY] src/components/Header.tsx
- Stitchの新しいスタイル（ブラー効果、アイコン、UI）に合わせてデザインを更新するが、ナビゲーションリンク名（イージーカット、イージートーン、イージートリミング）は既存のものを維持します。
#### [MODIFY] src/app/page.tsx
- ヒーローセクションの文言とデザインを新しいH1/Pタグのものに更新。
- **※ ヒーローセクション（アップロードエリアを含む）のみを更新し、以降のセクション（使い方ガイド、機能紹介、トリミング誘導、FAQ、事例紹介など）には触れず既存のまま維持します。**
#### [MODIFY] src/components/BgRemover.tsx または [MODIFY] src/components/UploadArea.tsx
- アップロードエリア（`UploadArea`）のデザインをStitchのドラッグ＆ドロップ用UIに合わせて更新。

## Phase 2: アップロードエリア以降のデザイン反映

### 1. 切り抜きモード設定
- 既存のTailwindスタイル（単なるborder/bg変化）から、左側にMaterial Symbolsのアイコン（`draw`, `high_quality`, `magic_button`）を設けたリッチなカードUI（`grid grid-cols-1 gap-4`）へと変更する。
- ProバッジのデザインをStitch指定のオレンジ色の小さな丸薬型バッジへと差し替える。

### 2. 出力サイズ設定
- 既存の `RatioButton` コンポーネントを使用している部分を、Stitchデザインの「Material Symbols付きの四角いボタン (`grid-cols-2 sm:grid-cols-5`)」へインライン展開・置換する。

### 3. 背景カスタマイズ
- 「なし」「アップロード」「カスタム」等のアクションボタンを、Stitchのアイコン付きスクエアデザインに更新。
- テンプレート画像群も `aspect-square rounded-2xl` なデザインに合わせる。

### 4. 高度な設定（ナチュラルブレンド）
- 既存のチェックボックスから、Stitchデザインの「トグルスイッチ」を模したモダンなUIコンポーネントに変更し、アイコン（`flare`）を併設する。

### 5. フローティングアクションボタン（＆ 処理ファイルリスト）
- 既存のファイルリストのアイテムデザイン（丸みを帯びた `rounded-3xl` なカード状）を適用する。
- 画面右下の巨大な「背景を透過する」グラデーションボタンと、その上部に現在のステータス（モード・サイズ・背景）のチップを表示するUIを実装し、既存の処理開始ロジック（`handleStartProcessing`）と紐付ける。

## Phase 3: 料金プラン（Pro機能訴求）エリアのデザイン刷新

### 1. PricingTable.tsx の刷新
- 従来の `<table>` 要素による比較表を廃止し、Stitchモック（`pricing_stitch.html`）に合わせた2カラム（Free/Pro）のカード形式レイアウトに変更する。
- TailwindカラーはStitchの青色（`primary`）ではなく、サイトのベースオレンジ（`pro-orange`、`amber`系）を使用する。
- 料金や特徴リストをStitchの `border-b` リスト形式で表示する。
- `renderProCta` などのRender Propsを受け取れるようにし、呼び出し元から購入ボタンをカード内に注入できるようにする。

### 2. ProCtaSection.tsx の調整
- `PricingTable` の2カラムカードに合わせて親のレイアウトを調整する。右側に固定されていた価格＋購入ボタン領域を撤廃し、`PricingTable` 内部のRender Propsとして渡すように変更する。

### 3. 他ページ/モーダルのPricingTable互換性調整
- `PricingModal.tsx` および `AccountPricingSection.tsx` においても、新しくなった `PricingTable` に対して適切なCTAをRender Props経由で渡せるように調整する。

## Verification Plan

### Automated Tests
- TypeScriptのコンパイルエラーが出ないか、リンターを通っているかを確認。
### Manual Verification
- ローカル環境でトップページの見た目がStitchのモックアップと一致していることをブラウザで確認。
- 既存の画像アップロード、サイズ選択、処理モード選択などの状態管理（State）が正しく同期して動いているかを確認。
