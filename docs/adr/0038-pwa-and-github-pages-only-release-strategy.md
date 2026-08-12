# ADR-0038：只發行 PWA 與 GitHub Pages 版本

## 狀態

已接受

## 背景

目前的正式 Release 同時建置 PWA ZIP、Windows Tauri 安裝版、可攜版與各檔案 checksum。原生桌面產物需要 Rust、NSIS、固定版 WebView2 runtime 與 Windows runner，讓發布流程和維護面積都遠大於目前的瀏覽器產品需求。版本與下載頁也因此必須維護已不再是主要交付方式的桌面資產連結。

## 決策

MediaCompressor 的正式交付只保留瀏覽器版：

1. GitHub Pages 提供目前的預覽版與正式版本的 PWA 入口。
2. 正式 `vX.Y.Z` tag 的 GitHub Release 只附加 `MediaCompressor-vX.Y.Z-PWA.zip` 與 Release notes。
3. Release workflow 使用 Linux runner，執行 tag／版本／CHANGELOG 驗證、`npm ci`、lint、PWA build、ZIP 封裝與不可覆寫的 GitHub Release 建立。
4. 移除 Tauri 原始碼、NSIS 封裝腳本、Rust／WebView2 發布步驟與 `@tauri-apps/cli` 依賴。
5. 版本目錄只使用 `version`、`publishedAt`、`summary`、`pwaInstallUrl`、`pwaZipUrl` 與 `releaseNotesUrl`；不再接受 Setup、Portable 或 checksum 欄位。

本決策取代 ADR-0023 的 Windows 安裝版與可攜版交付方案，並取代相關文件中對 Windows Release 資產的現行說明；歷史 ADR 仍保留作為過往決策紀錄。

## 後果

- Release workflow 不再需要 Windows runner、Rust toolchain、NSIS、WebView2 runtime 或 Windows 專用封裝工具。
- 使用者透過 GitHub Pages 開啟指定版本的 PWA，或下載 PWA ZIP 部署到自有 HTTPS 主機。
- 不再提供原生 Windows 安裝程式、可攜版或逐檔 checksum；若未來重新支援桌面交付，必須另行提出新的架構決策。
- `public/releases.json` 與版本目錄 UI 的資料契約更小，並能避免顯示失效的桌面資產連結。
