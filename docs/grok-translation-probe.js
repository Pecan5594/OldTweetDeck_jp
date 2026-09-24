// x.com のリストで Grok 自動翻訳が「どの API の、どのフィールド」に入っているかを調べるスニペット。
// 使い方は docs/CUSTOMIZATION_JA.md の「Grok 翻訳の確認方法」を参照。
// x.com を開いた状態で開発者ツールの Console に貼り付けて実行し、ページを再読み込みせずにリストへ移動する。
// 通信内容は外部に送信しない（コンソールに表示するだけ）。
(() => {
    const KEY_RE = /transl|grok/i;
    const found = (window.__grokProbe = window.__grokProbe || []);

    function walk(node, path, url, depth) {
        if (!node || typeof node !== "object" || depth > 40) return;
        for (const [key, value] of Object.entries(node)) {
            const p = `${path}.${key}`;
            if (KEY_RE.test(key) && !/features|is_translatable/i.test(key)) {
                const sample = typeof value === "object" ? JSON.stringify(value).slice(0, 400) : String(value);
                found.push({ url, path: p, sample });
                console.log("%c[grok-probe]", "color:#1d9bf0;font-weight:bold", url, "\n", p, "\n", sample);
            }
            walk(value, p, url, depth + 1);
        }
    }

    function inspect(url, text) {
        if (!/\/graphql\/|\/api\/|translat/i.test(url)) return;
        let json;
        try { json = JSON.parse(text); } catch (e) { return; }
        const name = url.split("?")[0].split("/").pop();
        walk(json, "$", name, 0);
    }

    // リクエスト側の features に含まれる grok/翻訳系フラグも表示する
    function logFeatures(url) {
        try {
            const u = new URL(url, location.href);
            const features = u.searchParams.get("features");
            if (!features) return;
            const flags = Object.entries(JSON.parse(features)).filter(([k]) => KEY_RE.test(k));
            if (flags.length) console.log("[grok-probe] request flags", u.pathname.split("/").pop(), Object.fromEntries(flags));
        } catch (e) {}
    }

    if (!window.__grokProbeInstalled) {
        window.__grokProbeInstalled = true;

        const origFetch = window.fetch;
        window.fetch = async function (input, init) {
            const res = await origFetch.apply(this, arguments);
            const url = typeof input === "string" ? input : input.url;
            logFeatures(url);
            res.clone().text().then(t => inspect(url, t)).catch(() => {});
            return res;
        };

        const origOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method, url) {
            this.__probeUrl = String(url);
            logFeatures(this.__probeUrl);
            this.addEventListener("load", () => {
                try {
                    if (this.responseType === "" || this.responseType === "text") inspect(this.__probeUrl, this.responseText);
                    else if (this.responseType === "json") inspect(this.__probeUrl, JSON.stringify(this.response));
                } catch (e) {}
            });
            return origOpen.apply(this, arguments);
        };
    }

    console.log("[grok-probe] 準備完了。ページを再読み込みせずにリストを開いてください。結果は __grokProbe に溜まります（copy(__grokProbe) でコピー）。");
})();
