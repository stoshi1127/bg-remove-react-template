# GA4イベント計測

2026年7月21日以降の画像処理障害とアクセス減少の基準値は[障害分析](ga4-incident-2026-07-21.md)に記録する。

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

## 画像処理ファネル

| イベント | タイミング |
| --- | --- |
| `image_processing_started` | 入力検証が終わり、画像処理を実際に開始したとき |
| `image_processing_completed` | バッチが終了したとき。`result_status`は`success` / `partial_success` / `failure` |
| `image_processing_canceled` | 利用者が処理中のキャンセルを押したとき |
| `image_download_started` | 単体画像の取得またはZIP生成を開始したとき |
| `image_download_completed` | ブラウザの保存処理を呼び出せたとき |
| `image_download_failed` | 画像取得またはZIP生成に失敗したとき |

処理イベントには`user_plan`、`processing_mode`、`processing_type`、`image_count`を付ける。終了時には`success_count`、`failure_count`、`duration_ms`も付ける。キャンセルと完了は同一バッチで両方送信しない。

ダウンロードイベントには`download_type`（`single` / `zip`）と`image_count`を付ける。単体保存には`processing_mode`と`output_quality`（`standard` / `high_quality`）も付ける。ファイル名、画像URL、画像データは送信しない。

`processing_type`、`result_status`、`download_type`、`output_quality`はイベント範囲のカスタムディメンション、`success_count`、`failure_count`、`duration_ms`はカスタム指標として登録する。`duration_ms`の測定単位はミリ秒、その他は標準とする。既存の`image_count`も処理・保存枚数の集計に使う。

## 公開後の確認

- DebugViewで各イベントと`event_source`を確認する。
- 24〜48時間後、探索で購入ファネルを作る。
- 流入元は「セッションの参照元 / メディア」で確認し、`top_cta`などUI上の場所が新規に入らないことを確認する。
- 新旧イベント名をまたぐスポンサー集計では、公開日前の`ad_loaded` / `ad_impression` / `ad_click`と公開日後の`sponsor_*`を別期間として扱う。
