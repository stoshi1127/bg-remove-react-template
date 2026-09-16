# Google Search Console ローカル接続

`scripts/analytics/search_console.py` はGoogle公式Search Console APIを読み取り専用で利用する。第三者の分析サービスを経由せず、OAuth認証情報はGit対象外の `.local/gsc/read-credentials.json` に保存する。

## 初回認証

既存のGA4用OAuthデスクトップクライアントを再利用し、Search Consoleの読み取り専用スコープだけを別認証として取得する。

```powershell
.\.local\ga4\venv\Scripts\python.exe scripts\analytics\search_console.py login
```

Google CloudプロジェクトでSearch Console APIが有効になっている必要がある。認証には、対象プロパティへの閲覧権限を持つGoogleアカウントを使う。

## 読み取り

```powershell
# アクセス可能なプロパティを確認
.\.local\ga4\venv\Scripts\python.exe scripts\analytics\search_console.py sites

# 集計、上位ページ、上位クエリ、日別推移
.\.local\ga4\venv\Scripts\python.exe scripts\analytics\search_console.py summary --site-url 'https://bg.quicktools.jp/'
.\.local\ga4\venv\Scripts\python.exe scripts\analytics\search_console.py pages --site-url 'https://bg.quicktools.jp/' --limit 10
.\.local\ga4\venv\Scripts\python.exe scripts\analytics\search_console.py queries --site-url 'https://bg.quicktools.jp/' --limit 10
.\.local\ga4\venv\Scripts\python.exe scripts\analytics\search_console.py daily --site-url 'https://bg.quicktools.jp/'
```

プロパティ一覧が `sc-domain:quicktools.jp` を返す場合は、その値を `--site-url` に指定する。既定期間は処理遅延を考慮した3日前までの28日間。
