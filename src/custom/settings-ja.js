// OldTweetDeck_jp: Japanese labels and explanations for TweetDeck's own settings dialog.
//
// Rewrites the text of #settings-modal (General / Link Shortening / Mute tabs) after TweetDeck renders it.
// Only exact matches of the known English strings are replaced, so anything new or changed upstream
// simply stays in English. Settings with an explanation get it as a line below the label and as a
// tooltip on the row (tooltip only for the narrow Theme / Columns / Font size groups).
(function () {
    "use strict";

    // English text -> Japanese text
    const LABELS = {
        "Settings": "設定",
        "Done": "完了",

        // tabs
        "General": "一般",
        "Link Shortening": "リンク短縮",
        "Mute": "ミュート",

        // General
        "General Settings": "一般設定",
        "Stream Tweets in realtime": "ツイートをリアルタイムで表示",
        "Show notifications on startup": "起動時にも通知を表示",
        "Display media that may contain sensitive content": "センシティブな内容を含む可能性のあるメディアを表示",
        "Autoplay GIFs": "GIF を自動再生",
        "Enable tweet auto expand (OldTweetDeck)": "長いツイートを自動で展開（OldTweetDeck）",
        "Show all replies in home column (OldTweetDeck)": "ホームカラムにすべての返信を表示（OldTweetDeck）",
        "Theme": "テーマ",
        "Dark": "ダーク",
        "Light": "ライト",
        "Columns": "カラム幅",
        "Narrow": "狭い",
        "Medium": "中",
        "Wide": "広い",
        "Font size": "文字サイズ",
        "Smallest": "最小",
        "Small": "小",
        "Large": "大",
        "Largest": "最大",

        // Link Shortening
        "Services Settings": "サービス設定",
        "Bit.ly Username": "Bit.ly ユーザー名",
        "Bit.ly API Key": "Bit.ly API キー",

        // Mute
        "Mute Settings": "ミュート設定",
        "Words or phrases": "語句",
        "Tweet Source": "投稿元クライアント",
        "Matching": "対象",

        // footer (OldTweetDeck)
        "Using OldTweetDeck by": "OldTweetDeck 作者:",
        "Please Donate!": "寄付のお願い（本家）",
        "Import state": "状態をインポート",
        "Export state": "状態をエクスポート",
    };

    // English text -> explanation shown below the setting
    const DESCRIPTIONS = {
        "Stream Tweets in realtime":
            "新着ツイートを自動で取得してカラムに追加します。OldTweetDeck では X の仕様上、本当のリアルタイム配信ではなく、数十秒おきの取得になります。",
        "Show notifications on startup":
            "TweetDeck を開いた直後に読み込まれたツイートについても、通知を有効にしたカラムの通知（音・デスクトップ通知）を出します。オフにすると、起動後に届いたツイートだけが通知の対象になります。",
        "Display media that may contain sensitive content":
            "オンにすると、センシティブな内容として指定された画像・動画もそのまま表示します。オフにすると、クリックするまで隠されます。",
        "Autoplay GIFs":
            "GIF アニメをタイムライン上で自動再生します。オフにすると、クリックしたときだけ再生します。",
        "Enable tweet auto expand (OldTweetDeck)":
            "途中で省略された長いツイートの「Expand tweet」を自動で押し、全文を読み込んで表示します。ツイートごとに追加の通信が発生します。",
        "Show all replies in home column (OldTweetDeck)":
            "ホームカラムで、通常は省かれる返信（フォローしていない人宛ての返信など）も表示します。",
        "Theme": "画面全体の配色です。",
        "Columns": "各カラムの横幅です。狭いほど画面に多くのカラムが並びます。",
        "Font size": "ツイートなどの文字の大きさです。",
        "Link Shortening":
            "ツイートに入れた URL を短縮するサービスです。「Twitter」は X 標準の t.co、「Bit.ly」を選ぶと下に Bit.ly アカウントの入力欄が出ます。",
        "Bit.ly Username": "Bit.ly のアカウント名です（Bit.ly を選んだ場合のみ）。",
        "Bit.ly API Key": "Bit.ly の API キーです（Bit.ly を選んだ場合のみ）。",
        "Mute":
            "ミュートする対象の種類です。「語句」はツイート本文に含まれる言葉、「投稿元クライアント」はツイートの投稿に使われたアプリ名で判定します。",
        "Matching":
            "ミュートしたい語句（またはクライアント名）を入力して「ミュート」を押すと、一致するツイートが全カラムで非表示になります。このミュートは TweetDeck の中だけで有効です。",
    };

    // attributes and whole blocks
    const PLACEHOLDERS = {
        "Enter a word or phrase": "語句を入力",
    };
    const BUTTON_VALUES = {
        "Remove": "解除",
    };
    const BUTTON_TITLES = {
        "importState()": "「状態をエクスポート」で保存したファイルから、カラム構成と設定（OldTweetDeck JP の設定を含む）を復元し、ページを再読み込みします。",
        "exportState()": "カラム構成と設定（OldTweetDeck JP の設定を含む）をファイル（OTDState.json）に保存します。別の PC への移行やバックアップに使えます。",
    };
    const FILTER_TYPES = { "": "", "user": "ユーザー ", "source": "クライアント " };

    function addDescription(textNode, key) {
        const element = textNode.parentElement;
        // only labels inside the settings form (not the tab list or the "Mute" button)
        if (!element || !element.closest("fieldset") || element.closest("button, option")) return;
        const anchor = element.closest(".obj-left, .control-group > div, .control-group") || element;
        anchor.title = DESCRIPTIONS[key];
        // Theme / Columns / Font size are narrow side-by-side groups: tooltip only, to keep the layout
        if (anchor.classList.contains("obj-left")) return;
        if (anchor.querySelector(`:scope > .otdjp-ja-desc[data-key="${CSS.escape(key)}"]`)) return;
        const description = document.createElement("div");
        description.className = "otdjp-ja-desc";
        description.dataset.key = key;
        description.textContent = DESCRIPTIONS[key];
        anchor.appendChild(description);
    }

    function translateTextNodes(root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        for (const node of nodes) {
            const key = node.nodeValue.trim();
            if (!key) continue;
            if (Object.prototype.hasOwnProperty.call(LABELS, key)) {
                node.nodeValue = node.nodeValue.replace(key, LABELS[key]);
                if (DESCRIPTIONS[key]) addDescription(node, key);
                continue;
            }
            // mute list rows: "Muting <type> <value>" (type is empty for words or phrases)
            const muting = /^Muting (user |source |)\s*([\s\S]*)$/.exec(key);
            if (muting) {
                node.nodeValue = node.nodeValue.replace(key, `ミュート中: ${FILTER_TYPES[muting[1].trim()]}${muting[2]}`);
            }
        }
    }

    function translateAttributes(root) {
        for (const input of root.querySelectorAll("input[placeholder]")) {
            const ja = PLACEHOLDERS[input.placeholder];
            if (ja) input.placeholder = ja;
        }
        for (const input of root.querySelectorAll('input[type="button"]')) {
            const ja = BUTTON_VALUES[input.value];
            if (ja) input.value = ja;
        }
        for (const [onclick, title] of Object.entries(BUTTON_TITLES)) {
            for (const button of root.querySelectorAll(`button[onclick="${onclick}"]`)) {
                if (!button.title) button.title = title;
            }
        }
        // mute tab note (text with a link inside)
        for (const p of root.querySelectorAll("#global_filter_settings p")) {
            if (p.textContent.trim().startsWith("User mutes work across")) {
                p.innerHTML = 'ユーザーのミュートは TweetDeck と X の両方に適用されます。ミュートしているユーザーの一覧は <a href="https://x.com/settings/muted/all" target="_blank" rel="url">x.com の設定</a>で確認できます。';
            }
        }
    }

    function translate(root) {
        translateTextNodes(root);
        translateAttributes(root);
    }

    function injectStyle() {
        const style = document.createElement("style");
        style.textContent = `
            #settings-modal .otdjp-ja-desc {
                margin: 1px 0 6px 26px; font-size: 11px; line-height: 15px; opacity: .75; white-space: normal;
            }
            #settings-modal .control-group > .otdjp-ja-desc { margin-left: 0; max-width: 360px; }
        `;
        document.head.appendChild(style);
    }

    const readyTimer = setInterval(() => {
        const modal = document.getElementById("settings-modal");
        if (!modal) return;
        clearInterval(readyTimer);
        injectStyle();
        translate(modal);
        // Our own edits trigger the observer again, but a second pass finds nothing left to replace.
        new MutationObserver(() => translate(modal)).observe(modal, { childList: true, subtree: true });
    }, 500);
})();
