# GA4イベント計測

## Pro購入ファネル

公開後は次の順序で探索のファネルを作成する。

1. `pro_purchase_click` — Pro購入導線を押した
2. `purchase_modal_view` — ゲスト購入モーダルを表示した
3. `purchase_method_selected` — Googleまたはメールを選択した
4. `checkout_started` — 外部の認証・決済画面へ移動した
5. `checkout_completed` — Stripe APIで支払い済みを検証した戻り経路を表示した

`pro_high_precision_click`は、未契約者が「高精度」処理を選んだ場合だけ送信する。一般のPro購入導線には送信しない。

`checkout_completed`にはCheckout Session IDそのものを送らず、そのSHA-256ハッシュの先頭20文字をブラウザ内の重複防止にだけ使う。同じ完了URLの再読み込みでは再送しない。契約状態の正本はStripe webhookとDBであり、GA4イベントは分析用とする。

## パラメータ

| パラメータ | 用途 |
| --- | --- |
| `event_source` | ボタンや表示場所。GA4標準の流入元`source`との衝突を避ける |
| `purchase_method` | `google` / `email` |
| `billing_flow` | `account` / `google` / `email` |

上記3件はプロパティ`489868388`へイベント範囲のカスタムディメンションとして登録済み。旧`source`パラメータを使った過去イベントで汚染された流入元データは修復できないため、公開日を境に比較する。

## 表示イベント

`pricing_table_view`は料金表の50%以上が画面内に入った時点で1回だけ送信する。Intersection Observerが利用できない環境では表示可能とみなして1回送信する。

スポンサー枠はGA4の予約イベント名との衝突を避け、`sponsor_loaded`、`sponsor_impression`、`sponsor_click`を使う。`sponsor_impression`は枠の50%以上が画面内に入った時点で送信する。

## 公開後の確認

- DebugViewで各イベントと`event_source`を確認する。
- 24〜48時間後、探索で購入ファネルを作る。
- 流入元は「セッションの参照元 / メディア」で確認し、`top_cta`などUI上の場所が新規に入らないことを確認する。
- 新旧イベント名をまたぐスポンサー集計では、公開日前の`ad_loaded` / `ad_impression` / `ad_click`と公開日後の`sponsor_*`を別期間として扱う。
