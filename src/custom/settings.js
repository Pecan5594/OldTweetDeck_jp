// OldTweetDeck_jp: settings dialog and backup of the OldTweetDeck JP settings.
//
// - Adds an "OldTweetDeck JP 設定" button next to "Import state" / "Export state" at the bottom of
//   TweetDeck's settings, which opens a dialog for the auto-translate settings (see auto-translate.js).
// - Adds the settings to the file written by "Export state" and restores them on "Import state".
//   The upstream exportState() / importState() in interception.js are wrapped, not copied, so their
//   own behavior keeps following upstream updates.
(function () {
    "use strict";

    const LANGUAGES = [
        ["ja", "日本語"],
        ["en", "English"],
        ["ko", "한국어"],
        ["zh", "中文"],
        ["es", "Español"],
        ["fr", "Français"],
        ["de", "Deutsch"],
        ["pt", "Português"],
    ];

    const api = () => window.OTDjpTranslate;

    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    // ---- backup: Export state / Import state ----

    // exportState() serializes {feeds, columns, settings, columnIds} into a Blob; the Blob constructor
    // is swapped only for the duration of that call to add an "otdjp" entry to the JSON.
    function wrapExport() {
        if (typeof window.exportState !== "function" || window.exportState.__otdjp) return;
        const original = window.exportState;
        const wrapped = function () {
            const OriginalBlob = window.Blob;
            window.Blob = function (parts, options) {
                try {
                    if (parts && parts.length === 1 && typeof parts[0] === "string" && api()) {
                        const data = JSON.parse(parts[0]);
                        if (data && data.columns && data.feeds) {
                            data.otdjp = api().exportData();
                            parts = [JSON.stringify(data)];
                        }
                    }
                } catch (e) {
                    console.warn("[OTDjp] failed to add settings to the export", e);
                }
                return new OriginalBlob(parts, options);
            };
            try {
                return original.apply(this, arguments);
            } finally {
                window.Blob = OriginalBlob;
            }
        };
        wrapped.__otdjp = true;
        window.exportState = wrapped;
    }

    // importState() reads the chosen file with FileReader, writes localStorage and reloads.
    // While an import is in progress, the "otdjp" entry of the same file is restored as well.
    let importing = false;
    function wrapImport() {
        if (typeof window.importState !== "function" || window.importState.__otdjp) return;
        const original = window.importState;
        const readAsText = FileReader.prototype.readAsText;
        FileReader.prototype.readAsText = function () {
            if (importing) {
                importing = false;
                this.addEventListener("load", () => {
                    try {
                        const data = JSON.parse(this.result);
                        // only a valid OldTweetDeck state file is imported by upstream as well
                        if (data && data.feeds && data.columns && data.settings && data.columnIds && data.otdjp && api()) {
                            api().importData(data.otdjp);
                        }
                    } catch (e) {}
                });
            }
            return readAsText.apply(this, arguments);
        };
        const wrapped = function () {
            importing = true;
            return original.apply(this, arguments);
        };
        wrapped.__otdjp = true;
        window.importState = wrapped;
    }

    // ---- settings dialog ----

    function closeDialog() {
        const overlay = document.querySelector(".otdjp-settings-overlay");
        if (overlay) overlay.remove();
    }

    function renderColumns(container) {
        const list = api().columnList();
        if (!list.length) {
            container.innerHTML = `<div class="otdjp-muted">まだありません。カラム見出しの「翻訳 OFF」ボタンで ON にできます。</div>`;
            return;
        }
        container.innerHTML = list.map(c => `
            <div class="otdjp-settings-column">
                <span>${c.present ? escapeHtml(c.title || "(無題のカラム)") : `<span class="otdjp-muted">現在の画面にないカラム（${escapeHtml(c.id)}）</span>`}</span>
                <button type="button" data-id="${escapeHtml(c.id)}">OFF にする</button>
            </div>`).join("");
        for (const btn of container.querySelectorAll("button[data-id]")) {
            btn.addEventListener("click", () => {
                api().removeColumn(btn.dataset.id);
                renderColumns(container);
            });
        }
    }

    function openDialog() {
        if (!api()) return;
        closeDialog();
        const settings = api().getSettings();
        const stats = api().stats();
        const overlay = document.createElement("div");
        overlay.className = "otdjp-settings-overlay";
        overlay.innerHTML = `
            <div class="otdjp-settings" role="dialog" aria-label="OldTweetDeck JP の設定">
                <h2>OldTweetDeck JP の設定</h2>

                <label class="otdjp-settings-row">翻訳先の言語
                    <select name="target">
                        ${LANGUAGES.map(([code, name]) => `<option value="${code}"${code === settings.target ? " selected" : ""}>${name}</option>`).join("")}
                    </select>
                </label>
                <label class="otdjp-settings-row">
                    <input type="checkbox" name="apiFallback"${settings.apiFallback ? " checked" : ""}>
                    Grok 翻訳が付いていないツイートは X の翻訳 API で翻訳する
                </label>
                <label class="otdjp-settings-row">
                    <input type="checkbox" name="communityNotes"${settings.communityNotes ? " checked" : ""}>
                    翻訳 ON のカラムにコミュニティノートを表示する
                </label>

                <h3>翻訳 ON のカラム</h3>
                <div class="otdjp-settings-columns"></div>

                <h3>翻訳キャッシュ</h3>
                <div class="otdjp-settings-row">
                    <span class="otdjp-cache-count">${stats.cached} 件</span>
                    <button type="button" name="clearCache">キャッシュを消去</button>
                </div>

                <h3>その他</h3>
                <div class="otdjp-settings-row">
                    <button type="button" name="hint">ボタンの場所の案内をもう一度表示</button>
                </div>
                <div class="otdjp-muted">
                    これらの設定と翻訳 ON のカラムは、下の「Export state」で書き出すファイルに含まれ、「Import state」で復元されます（翻訳キャッシュは含みません）。
                </div>

                <div class="otdjp-settings-footer">
                    <button type="button" name="close" class="Button--primary">閉じる</button>
                </div>
            </div>`;

        overlay.addEventListener("click", e => {
            if (e.target === overlay) closeDialog();
        });
        overlay.querySelector('select[name="target"]').addEventListener("change", e => api().setSetting("target", e.target.value));
        overlay.querySelector('input[name="apiFallback"]').addEventListener("change", e => api().setSetting("apiFallback", e.target.checked));
        overlay.querySelector('input[name="communityNotes"]').addEventListener("change", e => api().setSetting("communityNotes", e.target.checked));
        overlay.querySelector('button[name="clearCache"]').addEventListener("click", () => {
            api().clearCache();
            overlay.querySelector(".otdjp-cache-count").textContent = `${api().stats().cached} 件`;
        });
        overlay.querySelector('button[name="hint"]').addEventListener("click", () => {
            closeDialog();
            api().hint();
        });
        overlay.querySelector('button[name="close"]').addEventListener("click", closeDialog);
        renderColumns(overlay.querySelector(".otdjp-settings-columns"));
        document.body.appendChild(overlay);
    }

    document.addEventListener("keydown", e => {
        if (e.key === "Escape" && document.querySelector(".otdjp-settings-overlay")) closeDialog();
    });

    // The button next to "Export state" in TweetDeck's settings.
    function ensureSettingsButton() {
        for (const exportButton of document.querySelectorAll('button[onclick="exportState()"]')) {
            if (exportButton.parentElement.querySelector(".otdjp-settings-open")) continue;
            const button = document.createElement("button");
            button.type = "button";
            button.className = "Button--primary otdjp-settings-open";
            button.innerHTML = `<span class="label">OldTweetDeck JP 設定</span>`;
            button.addEventListener("click", e => {
                e.preventDefault();
                openDialog();
            });
            exportButton.insertAdjacentElement("afterend", button);
        }
    }

    function injectStyle() {
        const style = document.createElement("style");
        style.textContent = `
            .otdjp-settings-open { margin-left: 4px; }
            .otdjp-settings-overlay {
                position: fixed; inset: 0; z-index: 10001; background: rgba(0,0,0,.5);
                display: flex; align-items: center; justify-content: center;
            }
            .otdjp-settings {
                width: 440px; max-width: calc(100vw - 32px); max-height: calc(100vh - 32px); overflow-y: auto;
                padding: 16px 20px; border-radius: 10px; background: #15202b; color: #fff;
                font-size: 13px; line-height: 19px; box-shadow: 0 8px 32px rgba(0,0,0,.5);
            }
            .otdjp-settings h2 { font-size: 17px; font-weight: bold; margin: 0 0 12px; }
            .otdjp-settings h3 { font-size: 13px; font-weight: bold; margin: 14px 0 6px; color: #8899a6; }
            .otdjp-settings-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
            .otdjp-settings select { margin-left: auto; padding: 2px 4px; color: #000; }
            .otdjp-settings input[type="checkbox"] { margin: 0; flex-shrink: 0; }
            .otdjp-settings button:not(.Button--primary) {
                padding: 2px 10px; border: 1px solid #8899a6; border-radius: 10px;
                background: transparent; color: #fff; cursor: pointer;
            }
            .otdjp-settings button:not(.Button--primary):hover { border-color: #1d9bf0; color: #1d9bf0; }
            .otdjp-settings-column {
                display: flex; align-items: center; justify-content: space-between; gap: 8px;
                padding: 4px 0; border-bottom: 1px solid #38444d;
            }
            .otdjp-muted { color: #8899a6; font-size: 12px; }
            .otdjp-settings-footer { margin-top: 14px; text-align: right; }
        `;
        document.head.appendChild(style);
    }

    wrapExport();
    wrapImport();

    window.OTDjpSettings = { open: openDialog };

    const readyTimer = setInterval(() => {
        if (window.TD && TD.ready && api() && document.body) {
            clearInterval(readyTimer);
            injectStyle();
            ensureSettingsButton();
            let timer = null;
            new MutationObserver(() => {
                if (timer) return;
                timer = setTimeout(() => {
                    timer = null;
                    ensureSettingsButton();
                }, 200);
            }).observe(document.body, { childList: true, subtree: true });
        }
    }, 500);
})();
