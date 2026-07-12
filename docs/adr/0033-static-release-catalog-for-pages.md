# ADR-0033：以靜態 releases.json 驅動 GitHub Pages 版本列表

## 狀態

已接受

## 背景

GitHub Pages 需要顯示可選的正式版本與其下載檔案。若由使用者的瀏覽器即時呼叫 GitHub API，會受 rate limit、網路狀態與 API 回應變化影響，也無法可靠地離線使用。

## 決策

每次正式 GitHub Release 由 Release workflow 產生或更新靜態 `releases.json`，並隨 Pages 內容部署。檔案至少包含版本號、發布日期、Release notes 摘要、GitHub Release 頁面 URL、Setup EXE、Portable EXE、PWA ZIP 與 checksum 的固定下載 URL。

Pages 網頁只讀取此靜態檔；不從瀏覽器直接呼叫 GitHub API。版本化 PWA 可將它與 UI 一起快取。

## 後果

- 版本列表無 GitHub API rate limit，且可在快取後離線顯示最後取得的清單。
- Release workflow 必須在發布資產 URL 確定後更新 catalog，並保留舊版條目。
- `releases.json` 是 Pages 的展示索引，不取代 GitHub Release 作為資產與 Release notes 的權威來源。
