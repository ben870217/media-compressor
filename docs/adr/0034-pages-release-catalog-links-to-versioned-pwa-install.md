# ADR-0034：Pages 版本目錄連至對應版本的 PWA 安裝頁

## 狀態

已接受

## 背景

使用者希望從 GitHub Pages 的版本列表直接取得指定版本的 PWA。Chrome 的安裝提示與 PWA manifest、service worker scope 綁定目前開啟的頁面；版本目錄頁不能替另一個版本的 URL 強制觸發安裝。

## 決策

版本目錄的每張正式版本卡片提供：

- 「開啟並安裝 PWA」：導向 `/media-compressor/releases/vX.Y.Z/`；使用者在該版本頁面以「安裝應用程式」按鈕觸發 Chrome 安裝流程。
- 「下載 PWA ZIP」：連至 GitHub Release asset，僅供內網或自有 HTTPS 主機部署。
- Setup EXE、Portable EXE、checksum 與 Release notes 的固定 GitHub Release 連結。

不在版本目錄頁嘗試靜默安裝、跨 URL 呼叫安裝提示或代理 Release 檔案。

## 後果

- 使用者可從單一目錄選擇並安裝指定版本，且安裝後保有該版本的獨立 identity 與離線快取。
- 安裝 PWA 需要兩個明確使用者動作：選擇版本、在版本頁確認安裝；這是 Chrome 的平台限制。
- PWA ZIP 的用途清楚與瀏覽器安裝流程區分，避免使用者誤以為下載 ZIP 可直接安裝。
