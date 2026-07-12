# ADR-0024：以版本化 GitHub Pages 發行固定版本的 PWA

## 狀態

已接受

## 背景

使用者需要可在 Chrome 中安裝的應用程式，同時已安裝版本不能隨 `main` 分支的 GitHub Pages 更新而變動。PWA 必須由 HTTPS 網址提供，不能從 GitHub Release 下載的 ZIP 或 `file://` 路徑直接安裝。

## 決策

- `main` 持續部署未版本化的線上預覽版。
- 每個正式 `vX.Y.Z` tag 將同一份 PWA 建置成果部署到不可覆寫的 GitHub Pages 路徑：`/media-compressor/releases/vX.Y.Z/`。
- 版本化路徑具有自己的 manifest、service worker、快取名稱與 scope；使用者從該路徑安裝時，該 PWA 僅取得該版本的資產與更新來源。
- 介面提供使用者手勢觸發的「安裝應用程式」按鈕；不嘗試強制顯示 Chrome 安裝提示。
- GitHub Release 附加相同版本的 PWA 靜態檔 ZIP，供內網或自有 HTTPS 主機部署；ZIP 不宣稱可直接以 Chrome 安裝。

## 後果

- 已安裝的 release PWA 不受後續 `main` 部署影響；要升級時，使用者明確開啟並安裝另一個版本化網址。
- GitHub Pages 發布流程須保留所有已發布版本的資產，且不得覆寫既有 release 路徑。
- Release workflow 除現有 Windows 資產外，需建置、驗證及附加 PWA ZIP。
- 發行版本數增加會提高 GitHub Pages 儲存與部署管理成本。
