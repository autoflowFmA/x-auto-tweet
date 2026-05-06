# X Auto Tweet

Gemini API でAIツール比較の投稿文を毎日自動生成し、X（旧Twitter）に投稿するシステムです。  
GitHub Actions で毎日朝9時（JST）に自動実行されます。

## 投稿サンプル

> 💡 ChatGPT vs GeminiのAPI料金を比較！GPT-4oは入力$5/100万トークンに対し、Gemini 1.5 Flashはなんと$0.075と約67倍の差✨ 個人開発なら圧倒的にGeminiがお得。無料枠も月15回/分まで使えるので試さない手はない🔥 用途に合わせてAIを使い分けてコストを最適化しよう！ #AI #ChatGPT #AIツール #コスト比較

---

## セットアップ手順

### 1. リポジトリをクローン

```bash
git clone https://github.com/あなたのユーザー名/x-auto-tweet.git
cd x-auto-tweet
```

### 2. 依存パッケージをインストール

```bash
npm install
```

### 3. APIキーを取得

#### Gemini API キー
1. [Google AI Studio](https://aistudio.google.com/app/apikey) にアクセス
2. 「Create API Key」をクリックしてAPIキーを取得

#### X (Twitter) API キー
1. [X Developer Portal](https://developer.twitter.com/en/portal/dashboard) にアクセス
2. プロジェクトとアプリを作成
3. **重要：App Permissions を「Read and Write」に設定**
4. 以下の4つのキーを取得：
   - API Key（`X_API_KEY`）
   - API Key Secret（`X_API_SECRET`）
   - Access Token（`X_ACCESS_TOKEN`）
   - Access Token Secret（`X_ACCESS_SECRET`）

### 4. .env ファイルを作成

```bash
cp .env.example .env
```

`.env` を開いて各キーを設定してください：

```
GEMINI_API_KEY=取得したGemini APIキー
X_API_KEY=取得したX APIキー
X_API_SECRET=取得したX APIシークレット
X_ACCESS_TOKEN=取得したアクセストークン
X_ACCESS_SECRET=取得したアクセストークンシークレット
```

### 5. ローカルで動作確認

```bash
npm start
```

正常に動作すると、Geminiが生成したツイートがXに投稿されます。

---

## GitHub Actions での自動実行設定

### GitHub Secrets の登録

1. GitHubリポジトリの **Settings → Secrets and variables → Actions** を開く
2. 「New repository secret」で以下の5つを登録：

| Secret名 | 値 |
|---|---|
| `GEMINI_API_KEY` | Gemini APIキー |
| `X_API_KEY` | X APIキー |
| `X_API_SECRET` | X APIシークレット |
| `X_ACCESS_TOKEN` | アクセストークン |
| `X_ACCESS_SECRET` | アクセストークンシークレット |

### 自動実行スケジュール

ツイート投稿は毎日 **JST 9:00 / 13:00 / 20:00** に自動実行されます。  
手動実行する場合は GitHub の **Actions タブ → Daily Auto Tweet → Run workflow** から実行できます。

### 自動いいね・リポスト

`auto-like/index.js` はAIツール関連のツイートを検索し、`Zen727Z6132` アカウントでいいね・リポストします。

- キーワード：`AIツール`、`ChatGPT`、`Claude`、`Gemini`、`AI副業`
- いいね：1時間ごとに最大2件（1日最大48件）
- リポスト：1時間ごとに最大1件
- 実行：GitHub Actions の `Hourly Auto Like And Repost` が1時間おきに実行
- リポストフィルター：`AIツール`、`ChatGPT`、`Claude`、`Gemini`、`AI副業`、`コスト比較`、料金比較系に明確に関係する投稿だけ対象
- 除外：検索後にも本文を再チェックし、無関係な投稿や占い・恋愛・懸賞系の投稿を除外

ローカルで確認する場合：

```bash
DRY_RUN=true npm run like
```

リポスト処理まで検証する場合：

```bash
DRY_RUN=true AUTO_REPOST_FORCE=true npm run like
```

---

## ファイル構成

```
x-auto-tweet/
├── auto-like/
│   └── index.js       # AIツール関連ツイートへの自動いいね・リポスト
├── auto-tweet/
│   ├── index.js       # メイン処理（生成 → 投稿）
│   └── prompt.js      # Geminiへのプロンプト・トピック一覧
├── .github/
│   └── workflows/
│       ├── like.yml   # 自動いいね・リポスト用ワークフロー
│       └── tweet.yml  # GitHub Actions ワークフロー
├── .env.example       # 環境変数の雛形
├── .gitignore
├── package.json
└── README.md
```

## カスタマイズ

### 投稿トピックを変更する

`auto-tweet/prompt.js` の `TOPICS` 配列にテーマを追加・変更できます。

### 投稿スタイルを変更する

`auto-tweet/prompt.js` の `getSystemPrompt()` 関数内の指示文を編集してください。

### 実行時刻を変更する

`.github/workflows/tweet.yml` の `cron` を変更してください。  
例：JST 12:00（正午）に変更する場合は `0 3 * * *`（UTC 3:00）になります。

---

## 注意事項

- X API は **Free プラン**でも月500件まで投稿可能です（毎日1件なら十分）
- Gemini API は**無料枠あり**（1分15リクエスト、1日1500リクエストまで無料）
- `.env` ファイルは絶対にGitにコミットしないでください（`.gitignore` 設定済み）
