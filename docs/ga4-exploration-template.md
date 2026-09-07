# GA4データ探索「QuickTools｜週次確認」

GA4の左メニューから「探索」→「空白」を開き、探索名を`QuickTools｜週次確認`にする。1つの探索に次の4タブを作る。

新しいカスタムディメンション・指標は、登録後にデータが送信されてから探索で利用可能になるまで24〜48時間かかる場合がある。公開前や反映待ちの間は表が空でも異常ではない。

## 最初にインポートする項目

### ディメンション

- 日付
- イベント名
- セッションのデフォルト チャネル グループ
- デバイス カテゴリ
- Event source
- User plan
- Processing mode
- Processing type
- Processing result status
- Download type
- Output quality
- Survey purpose
- Survey placement

### 指標

- イベント数
- 総ユーザー数
- セッション
- エンゲージド セッション
- 表示回数
- Image count
- Processing success count
- Processing failure count
- Processing duration

## タブ1「① 稼働状況」

毎日最初に見るタブ。処理開始があるのに完了がない障害を発見する。

| 設定 | 値 |
| --- | --- |
| 手法 | 自由形式 |
| ビジュアリゼーション | 折れ線グラフ |
| 行 | 日付 |
| 列 | イベント名 |
| 値 | イベント数 |
| 期間 | 過去7日間 |
| フィルタ | イベント名が下記の正規表現に一致 |

```text
^(image_processing_started|image_processing_completed|image_processing_canceled|image_download_completed)$
```

見る順番は次のとおり。

1. `image_processing_started`が普段どおり発生しているか
2. `image_processing_completed`が開始数に近いか
3. `image_processing_canceled`が急増していないか
4. `image_download_completed`まで到達しているか

開始があるのに完了が急減した場合は、集客より先に画像処理の障害を疑う。

## タブ2「② 処理結果」

どの処理で失敗が起きているかを確認する。

| 設定 | 値 |
| --- | --- |
| 手法 | 自由形式 |
| ビジュアリゼーション | 表 |
| 行 | Processing type → Processing mode → Processing result status |
| 列 | User plan |
| 値 | イベント数、Image count、Processing success count、Processing failure count、Processing duration |
| 期間 | 過去28日間 |
| フィルタ | イベント名が`image_processing_completed`と完全一致 |

`Processing duration`は期間内の合計値なので、平均時間を見る場合は`Processing duration ÷ イベント数`で計算する。まず`failure`と`partial_success`が特定のProcessing typeへ偏っていないかを見る。

## タブ3「③ Pro購入」

「＋」で新しいタブを追加し、手法に「ファネルデータ探索」を選ぶ。ファネル名は`処理後のPro転換`とする。

| 順序 | ステップ名 | 条件 |
| ---: | --- | --- |
| 1 | 処理完了 | イベント名=`image_processing_completed`、かつProcessing result statusが`success`または`partial_success` |
| 2 | Pro導線クリック | イベント名=`pro_purchase_click` |
| 3 | 決済開始 | イベント名=`checkout_started` |
| 4 | 購入完了 | イベント名=`checkout_completed` |

- 「オープン ファネル」はオフにする。
- 各ステップは「間接的に次のステップが続く」を使う。
- 期間は過去28日間にする。
- 内訳には最初は「デバイス カテゴリ」を置く。

このファネルは処理後に購入した人へ対象を絞る。ヘッダーから直接購入した人を含む全購入経路は、別途イベント名別の自由形式で確認する。

同じ探索内に自由形式タブ`Pro導線詳細`を追加する場合は、行を`Event source`、列を`イベント名`、値を`イベント数`と`総ユーザー数`にする。フィルタは次の正規表現を使う。

```text
^(pro_purchase_click|purchase_modal_view|purchase_method_selected|checkout_started|checkout_completed)$
```

## タブ4「④ 用途と集客」

最初は用途の表にする。

| 設定 | 値 |
| --- | --- |
| 手法 | 自由形式 |
| ビジュアリゼーション | 表 |
| 行 | Survey purpose |
| 列 | User plan |
| 値 | イベント数、Image count |
| 期間 | 過去28日間 |
| フィルタ | イベント名が`usage_survey_answer`と完全一致 |

回答数が30件未満の間は割合の上下で判断せず、回答を蓄積する。結果は全利用者の構成ではなく「回答者の用途」として扱う。

同じ探索内に自由形式タブ`Organic回復`を追加する。

| 設定 | 値 |
| --- | --- |
| 手法 | 自由形式 |
| ビジュアリゼーション | 折れ線グラフ |
| 行 | 日付 |
| 値 | セッション |
| 期間 | 復旧公開日から今日まで |
| フィルタ | セッションのデフォルト チャネル グループが`Organic Search`と完全一致 |

障害前の基準はOrganic Searchが1日平均138.5セッション。7日平均で短期変動をならし、まず70件/日、次に100件/日、最終的に障害前水準への回復を見る。

## 週次確認の順番

1. 稼働状況：開始と完了が同じ方向に動いているか
2. 処理結果：失敗が特定モードへ偏っていないか
3. Pro購入：最大の離脱ステップはどこか
4. 用途：回答が30件以上集まったか
5. Organic回復：7日平均が前週より回復しているか

公式資料：[自由形式のデータ探索](https://support.google.com/analytics/answer/9327972?hl=ja)、[ファネルデータ探索](https://support.google.com/analytics/answer/9327974?hl=ja)、[カスタム指標を探索へ追加する](https://support.google.com/analytics/answer/14239619?hl=ja)。
