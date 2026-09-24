# OldTweetDeck_jp カスタマイズ

## ファイル読み込みの仕組み

`src/injection.js`（拡張機能に同梱、`document_start` で実行）が TweetDeck のページを組み立てます。

1. 拡張機能内の `files/index.html` を読み込む
2. 拡張機能内の `src/challenge.js`・`src/interception.js`・`files/vendor.js`・`files/bundle.js`・`files/bundle.css`・`files/twitter-text.js` を読み込む
3. `localStorage.OTDalwaysUseLocalFiles` が未設定なら、**上流リポジトリ** `raw.githubusercontent.com/dimdenGD/OldTweetDeck/main/...` から同名ファイルを取得し、取得できたものは 2 のローカル版を**置き換える**
4. `<script>` / `<style>` としてページに挿入する
5. `oldtd.org/api/scripts` の追加スクリプトを読み込む

そのため、`src/interception.js` や `files/bundle.js` を直接編集しても、実行時に上流版で上書きされます。

## カスタマイズ用の読み込み口

2〜4 の直後に、`src/custom/scripts.json` に列挙したスクリプトを**拡張機能内からのみ**読み込みます（リモート取得はしません）。

```
src/custom/
  scripts.json        読み込むスクリプトの一覧（ここに追記する）
  auto-translate.js   カラム単位の自動翻訳
```

- カスタマイズは `src/custom/` に置き、上流ファイルは編集しないでください。上流の変更を取り込むときの衝突は `src/injection.js` の 1 か所だけになります。
- 読み込みは `bundle.js` の後なので、`TD` や `proxyRoutes`（interception.js のトップレベル定数）を参照できます。ただし TweetDeck の起動は非同期なので、`TD.ready` を待ってから処理してください。
- 拡張機能のファイルなので、変更後は拡張機能の再読み込みが必要です。

## 自動翻訳（auto-translate.js）

- 各カラムのヘッダーに「訳」ボタンが付きます。押したカラムだけで、日本語以外のツイートが翻訳文に置き換わります（引用ツイートも含む）。
- 翻訳文の下の「原文を表示」で原文と切り替えられます。
- 翻訳には、TweetDeck の「ツイートを翻訳」と同じ X の翻訳サービスを使います（`/1.1/translations/show.json` を interception.js が X の `translateTweet` に中継）。API キーは不要です。
- 翻訳結果は `localStorage.OTDjpTranslateCache` に保存します（最大 3000 件、古いものから削除）。同じツイートは再翻訳しません。翻訳不要（元から日本語など）という判定も保存します。
- リクエストは同時 2 件、間隔 0.4 秒です。失敗したら 30 秒待ち、そのツイートは 5 分後まで再試行しません。

### 設定・デバッグ（開発者コンソール）

```js
OTDjpTranslate.columns()          // 有効なカラムのキー
OTDjpTranslate.enable("c123...")  // カラムを有効化（無効化は disable）
OTDjpTranslate.stats()            // キャッシュ件数・キュー状況
OTDjpTranslate.clearCache()       // キャッシュを消去
localStorage.OTDjpTranslateTarget = "ja"  // 翻訳先言語（既定 ja）
```

### X 公式 Web の自動翻訳について

x.com のタイムラインに翻訳済みで並ぶのは、Grok による自動翻訳機能です。GraphQL の feature フラグ（`responsive_web_grok_show_grok_translated_post` など）で制御されていますが、レスポンスの形式は公開されておらず、ここでは確認できていません。そのため、形式が分かっている既存の翻訳 API を使っています。
