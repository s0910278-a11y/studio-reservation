# Netlify 本番環境デプロイ手順書 (Next.js Application)

今回構築した楽器スタジオ予約システム（Next.js App Router + GAS API）を、**Netlify** へデプロイして本番稼働させるための具体的な手順と設定事項を整理しました。

## 1. 事前準備（GitHub連携）
現在ローカルで開発しているこのプロジェクトを GitHub のリポジトリに Push （アップロード）してください。Netlify は GitHub リポジトリと連動して自動でビルド・デプロイを行うため、ソースコード全体が GitHub 上にあることが前提となります。

## 2. Netlify でのサイト作成手順
1. Netlify にログインし、ダッシュボードから **Add new site** > **Import an existing project** を選択します。
2. GitHub を選択し、先ほど Push したリポジトリを選択します。

## 3. ビルド設定 (Build settings)
リポジトリを選択すると、自動的に Next.js であることが検知され、以下の設定が推奨されます。そのまま変更せずに使用してください。
- **Base directory**: `空欄` または `/`
- **Build command**: `npm run build`
- **Publish directory**: `.next`

※ `next.config.mjs` は現在の設定のままで問題ありません。APIルート(`src/app/api/...`)を使用するため `output: 'export'`（完全静的出力）は設定しないでください。Netlify が自動的にAPIルートをサーバーレスFunctionとしてホスティングしてくれます。

## 4. 環境変数の設定 (Environment Variables) ★重要
本番環境でシステムが正しく GAS(Google Apps Script) と通信し、正しいURLをメール本文に含めるために以下の環境変数を設定してください。
設定場所：デプロイ設定画面の **Environment variables** セクション（またはデプロイ後の Site settings > Environment variables）

| 変数名 | 設定する値 | 役割 |
|---|---|---|
| `NEXT_PUBLIC_GAS_API_URL` | `https://script.google.com/macros/s/AKfycb.../exec` <br>*(現在 `.env` に記載されているGASのWeb App URL)* | Next.js がスプレッドシートやメール送信のバックエンドとして通信するGASのAPIエンドポイント |
| `NEXT_PUBLIC_BASE_URL` | `https://（あなたのNetlifyドメイン）.netlify.app` <br>*(または独自ドメインを設定した場合はそのURL)* | お客様に送信される予約完了メール内にある「キャンセルURL」のドメイン部分として使用されます。設定しない場合は `http://localhost:3001` が送られてしまいます。 |

## 5. GAS (Google Apps Script) 側の変更について
フロントエンドを Netlify に移行しても、基本的に **GAS 側のスクリプト修正は不要** です。
- **URL連携**: メール本文に含まれるアクセス先 URL は、上記 Netlify で設定した `NEXT_PUBLIC_BASE_URL` が動的に適用される仕組みになっているため、GAS をいじることなくフロント側からの安全な引渡しが完了します。
- **CORS設定について**: GAS の `doGet` / `doPost` (ContentService を用いたJSON返却) は、Google 側で自動的に CORS 制約を許可する処理が行われるため、Netlify ドメインからのアクセスであっても追加設定なしに通信可能です。

## 6. デプロイの実行と確認
1. 設定が完了したら **Deploy site** をクリックします。
2. 数分でビルドが完了し、緑色のURLリンクが発行されます。
3. デプロイされたURLにアクセスし、以下の動作確認を推奨します。
   - お客様予約画面から予約を行い、Netlify の本番URLの含まれたキャンセルメールが届くか。
   - `/admin` にアクセスし、予約のキャンセル・来店なし処理・リストからの「復元（他枠との被りエラー検知機能含む）」が動作するか。
   - `/display` の表示崩れがないか。

以上で、Netlify 本番環境への移行が完了します。
