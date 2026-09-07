# GA4ローカル接続

読み取りにはGoogle公式 `analytics-mcp`、設定変更には `scripts/analytics/ga4.py` を使う。設定変更用スクリプトは独自の補助ツールで、Google公式MCPの機能ではない。

接続先：Google Cloudプロジェクト `easycat-489113`、GA4プロパティ `489868388`（bg.quicktools.jp）、測定ID `G-YT0ZDBKL81`。MCP名は `ga4-analytics`。読み取りレポート取得・Admin API定義一覧取得・対象測定IDの一致・`canEdit: true` を確認済み。接続確認では設定を作成・変更していない。

その後の設定依頼により、アンケート用のカスタムディメンション5件と指標1件を登録・再取得確認済み。詳細は [usage-survey.md](usage-survey.md) を参照。

## 環境と認証

Python 3.12の仮想環境を `.local/ga4/venv` に作成。再構築時は次を実行する。

```powershell
python -m venv .local/ga4/venv
.\.local\ga4\venv\Scripts\python.exe -m pip install -r scripts/analytics/requirements.txt
```

Google CloudでAnalytics Data APIとAdmin APIを有効にし、OAuthデスクトップクライアントを作成する。ブラウザでGA4へのアクセス権があるアカウントを認証する。

```powershell
.\.local\ga4\venv\Scripts\python.exe scripts/analytics/ga4.py --profile read login --client-json 'ダウンロードしたJSONの絶対パス'
.\.local\ga4\venv\Scripts\python.exe scripts/analytics/ga4.py --profile edit login --client-json 'ダウンロードしたJSONの絶対パス'
```

読み取り用は `analytics.readonly`、設定用はそれに `analytics.edit` を加えた権限を要求する。設定変更には対象GA4プロパティ側の編集権限も必要。認証情報はGit対象外の `.local/ga4/read-credentials.json` と `edit-credentials.json` に保存する。ファイルの中身をチャット・ログ・Gitに載せない。サイトの `.env` やブラウザ配信用コードでは使用しない。

## 接続確認・設定操作

```powershell
# 読み取り用・設定用のそれぞれの認証でアクセス可能なプロパティを確認
.\.local\ga4\venv\Scripts\python.exe scripts/analytics/ga4.py --profile read accounts
.\.local\ga4\venv\Scripts\python.exe scripts/analytics/ga4.py --profile edit accounts

# 数値のプロパティIDを指定（G-から始まる測定IDとは別）
.\.local\ga4\venv\Scripts\python.exe scripts/analytics/ga4.py definitions --property 123456789

# 作成予定の確認。既存の同名・同スコープ定義は作成しない
.\.local\ga4\venv\Scripts\python.exe scripts/analytics/ga4.py --profile edit create-dimension --property 123456789 --parameter purpose --display-name 'Survey purpose'
# 実際に作成するときだけ、同じコマンドに --apply を付ける
```

`accounts` が成功しても編集権限まで検証したことにはならない。接続テストでGA4設定を書き換えない。全ての作成要求は既存定義を確認してから行う。

補助スクリプトの変更時は `.\.local\ga4\venv\Scripts\python.exe -m unittest discover -s scripts/analytics -p 'test_*.py'` で書き込み制御のオフラインテストを実行する。

## CodexのMCP登録

`codex mcp add ga4-analytics --env GOOGLE_APPLICATION_CREDENTIALS=<read-credentials.jsonの絶対パス> --env GOOGLE_PROJECT_ID=<Google CloudプロジェクトID> -- <venv/Scripts/analytics-mcp.exeの絶対パス>` でユーザー設定へ登録する。PowerShellでは空白を含む引数を引用符で囲む。

登録後はCodex拡張を再起動し、MCPツールが表示されることを確認する。設定用認証情報をMCPへ渡す必要はない。接続解除は `codex mcp remove ga4-analytics`。必要に応じてGoogleアカウント側でアプリのアクセスも解除する。

公式資料：[Google Analytics MCP](https://developers.google.com/analytics/devguides/MCP)、[Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)、[Admin API](https://developers.google.com/analytics/devguides/config/admin/v1)。アンケートの定義・集計方法は [usage-survey.md](usage-survey.md) を参照。
