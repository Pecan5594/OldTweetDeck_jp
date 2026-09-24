# OldTweetDeck JP カスタマイズ

この拡張機能は拡張機能一覧に **「OldTweetDeck JP (自動翻訳版)」** と表示されます。本家 [OldTweetDeck](https://github.com/dimdenGD/OldTweetDeck) とは別物です。
**本家と同時に有効にしないでください**（両方が同じページを組み立てるため、正しく動きません）。どちらか一方だけを有効にしてください。

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
  auto-translate.js   カラム単位の自動翻訳・コミュニティノート表示
  settings.js         設定画面・Export/Import state への設定の追加
  settings-ja.js      TweetDeck 標準の設定画面の日本語化・解説
docs/grok-translation-probe.js  x.com の Grok 翻訳の確認用スクリプト（拡張機能では使わない）
```

- カスタマイズは `src/custom/` に置き、上流ファイルは編集しないでください。上流の変更を取り込むときの衝突は `src/injection.js` の 1 か所だけになります。
- 読み込みは `bundle.js` の後なので、`TD` や `proxyRoutes`（interception.js のトップレベル定数）を参照できます。ただし TweetDeck の起動は非同期なので、`TD.ready` を待ってから処理してください。
- 拡張機能のファイルなので、変更後は拡張機能の再読み込みが必要です。

## 自動翻訳（auto-translate.js）

- ボタンの位置: 各カラムの見出しの右上、スライダー型の設定アイコン（カラムオプション）の左に **「翻訳 OFF」** ボタンがあります。

  ```
  ┌──────────────────────────────────────┐
  │ ≡  リスト名 @user     [翻訳 OFF] ⚙  │  ← カラムの見出し
  ├──────────────────────────────────────┤
  ```

  押すと青い **「翻訳 ON」** になり、そのカラムだけで日本語以外のツイートが翻訳文に置き換わります（引用ツイートも含む）。もう一度押すとオフになり、原文に戻ります。
- ON/OFF はカラムごとに記憶され、ページを再読み込みしても保たれます（`localStorage.OTDjpTranslateColumns` に、OldTweetDeck がカラムに付ける固定 ID で保存。TweetDeck 画面上のカラムキー `c…` は読み込みのたびに変わるため使っていません）。
- 初回起動時は、画面右下にボタンの場所を案内するメッセージが出ます。もう一度見たい場合はコンソールで `OTDjpTranslate.hint()` を実行します。
- ボタンが見当たらない場合は、この拡張機能が有効か、本家 OldTweetDeck が同時に有効になっていないかを確認してください。開発者コンソール（F12）に `[OTDjp] OldTweetDeck JP auto-translate ready` と出ていれば読み込まれています。
- 翻訳文の下の「原文を表示」で原文と切り替えられます。
- 翻訳文の入手方法（API キーは不要）:
  1. **Grok 翻訳（優先）**: x.com のリスト表示と同じ Grok 翻訳を使います。タイムライン取得時に feature フラグ `responsive_web_grok_show_grok_translated_post` を有効にし、応答の各ツイートにある `grok_translated_post_with_availability.data.translation` を取り出します。追加の通信は発生しません。翻訳文の下には「英語から翻訳（Grok）」と表示されます。
  2. **X の翻訳 API（予備）**: Grok 翻訳が付いていないツイート（`is_available: false`）だけ、TweetDeck の「ツイートを翻訳」と同じ API で 1 件ずつ翻訳します（`/1.1/translations/show.json` を interception.js が X の `translateTweet` に中継）。
- **コミュニティノート**: OldTweetDeck 本体はコミュニティノートを受け取っていますが表示していません。翻訳 ON のカラムでは、ツイート本文の下にコミュニティノートを表示します。X が Grok 翻訳を付けていればその訳（「コミュニティノート（Grok 翻訳）」）、なければ原文です（設定でオフにできます）。
- 翻訳結果は `localStorage.OTDjpTranslateCache` に保存します（最大 3000 件、古いものから削除）。同じツイートは再翻訳しません。翻訳不要（元から日本語など）という判定も保存します。
- リクエストは同時 2 件、間隔 0.4 秒です。失敗したら 30 秒待ち、そのツイートは 5 分後まで再試行しません。

### TweetDeck 標準の設定画面の日本語化（settings-ja.js）

TweetDeck の設定画面（一般・リンク短縮・ミュート）の項目名を日本語にし、各項目の下に日本語の解説を付けます。マウスを項目に乗せても同じ解説が出ます（テーマ・カラム幅・文字サイズは横並びの配置を崩さないよう、マウスオーバーのみ）。既知の英語表記と完全に一致する文字だけを置き換えるため、本家の更新で項目が増えたり文言が変わったりした場合、その部分は英語のまま表示されます（動作には影響しません）。

### 設定画面

TweetDeck の設定画面（左下の歯車 → Settings）の一番下、「状態をインポート」「状態をエクスポート」（Import state / Export state）の右にある **「OldTweetDeck JP 設定」** ボタンで開きます（見つからない場合はコンソールで `OTDjpSettings.open()`）。

- 翻訳先の言語（既定: 日本語）
- Grok 翻訳が付いていないツイートを X の翻訳 API で翻訳するか（オフにすると Grok 翻訳だけを使い、追加の通信をしない）
- 翻訳 ON のカラムにコミュニティノートを表示するか
- 翻訳 ON のカラムの一覧と、個別に OFF にするボタン（画面にないカラムの設定も消せます）
- 翻訳キャッシュの件数と消去
- ボタンの場所の案内をもう一度表示

### バックアップ

設定画面下部の「状態をエクスポート」（Export state）で書き出すファイル（`OTDState.json`）に、上記の設定と翻訳 ON のカラムが `otdjp` として追加されます。「状態をインポート」（Import state）でそのファイルを読み込むと一緒に復元されます。翻訳キャッシュは含みません。本家の exportState / importState はそのまま呼び出しているため、本家の書き出し内容は変わりません（本家版でこのファイルを読み込んでも `otdjp` は無視されます）。

### 設定・デバッグ（開発者コンソール）

```js
OTDjpTranslate.columns()          // 有効なカラムの固定 ID（"api:…"）
OTDjpTranslate.enable("c123...")  // 画面上のカラムキー（data-column）で有効化（無効化は disable）
OTDjpTranslate.stats()            // キャッシュ件数・キュー状況・Grok 翻訳の取得件数（grok）・コミュニティノート件数（notes）
OTDjpSettings.open()              // 設定画面を開く
OTDjpTranslate.clearCache()       // キャッシュを消去
localStorage.OTDjpTranslateTarget = "ja"  // 翻訳先言語（既定 ja。設定画面から変更可）
```

### X 公式 Web の自動翻訳（Grok）について

x.com のタイムラインに翻訳済みで並ぶのは、Grok による自動翻訳機能です。下記の確認用スクリプトで調べたところ、`ListLatestTweetsTimeline` の応答の各ツイート（`tweet_results.result`。リツイート元の `retweeted_status_result.result` と引用元の `quoted_status_result.result` も同様）に、次の形で入っていました。

```json
"grok_translated_post_with_availability": {
  "is_available": true,
  "data": {
    "destination_language": "ja",
    "source_language": "en",
    "translation": "翻訳文（全文）",
    "preview_translation": "翻訳文（途中まで。長いツイートのみ）",
    "entities": { "hashtags": [], "symbols": [], "urls": [...], "user_mentions": [...] }
  }
}
```

翻訳できないツイートは `{"is_available": false}` です。auto-translate.js はこの形式を前提にしています。X が形式を変えた場合は、下記の手順で調べ直してください。

#### Grok 翻訳の確認方法

**方法 A: 確認用スクリプトを使う（おすすめ）**

1. PC のブラウザで x.com にログインし、ホームを開く（リストはまだ開かない）
2. F12 で開発者ツールを開き、Console タブを選ぶ
3. [`docs/grok-translation-probe.js`](grok-translation-probe.js) の中身を貼り付けて Enter を押す
   - Chrome で「貼り付けを許可しますか」と警告が出たら、`allow pasting` と入力してから貼り付け直す
4. **ページを再読み込みせずに**、左メニューの「リスト」から翻訳されて表示されるリストを開く
5. コンソールに `[grok-probe]` で始まる行が出ます
   - `request flags ListLatestTweetsTimeline {...}`: x.com がリクエストで送っている Grok／翻訳関係のフラグ
   - `ListLatestTweetsTimeline $.data....<キー名>` と、その下の日本語文: 翻訳文が入っている場所
6. `copy(__grokProbe)` を実行すると結果がクリップボードにコピーされるので、それを共有してください
   - 結果に含まれるのは、キー名と翻訳文の先頭 400 文字だけです。Cookie やトークンは含みません

何も出ない場合は、翻訳文がタイムラインの応答には入っておらず、別の通信で取得されている可能性があります。その場合は方法 B で探します。

**方法 B: Network タブで直接探す**

1. x.com で開発者ツールを開き、Network タブを選ぶ
2. リストを開く（Network タブを開いたまま）
3. Network タブ内で Ctrl+F（Mac は Cmd+F）を押し、画面に表示されている**翻訳後の日本語の一部**を検索する
4. 見つかった通信の名前（例: `ListLatestTweetsTimeline`）と、Response 内で日本語が入っているキー名を確認する
5. その通信の Headers タブにある Request URL の `features=` 部分も確認する

通信の名前・キー名・features が分かれば、auto-translate.js の `GROK_FLAG` / `GROK_KEY` と `harvestGrok()` を合わせて直せます。
