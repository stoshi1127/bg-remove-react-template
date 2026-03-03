# 実装計画：モーダルの閉じるボタンのレイアウト修正

## 概要
モーダルの「×」ボタンを `flex` 内の要素としてではなく、`absolute` で右上に固定配置することで、タイトルエリアのレイアウトの自由度を高め、よりモダンなデザインにします。

## 変更内容

### [PricingModal.tsx](file:///Users/shinkai/my-bg-remover/src/components/PricingModal.tsx)
- 閉じるボタンに `absolute top-4 right-4` を適用
- `span` タグを追加し、文字サイズと行高を調整
- タイトルエリアを中央寄せ (`items-center`) に変更

### [GuestProPurchase.tsx](file:///Users/shinkai/my-bg-remover/src/components/GuestProPurchase.tsx)
- 閉じるボタンに `absolute top-4 right-4` を適用
- `span` タグを追加し、文字サイズと行高を調整
- タイトルエリアを中央寄せ (`items-center`) に変更し、余白を調整

## 検証計画
### 手動確認
- 開発サーバーで各モーダルを開き、閉じるボタンが右上に正しく配置されていること。
- タイトルや説明文が中央に正しく配置されていること。
- ホバー時の効果がプロフェッショナルに見えること。
