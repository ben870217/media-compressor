# 術語表

## 漸進揭露

先呈現完成目前任務所需的主要操作；將低頻或進階操作放入可展開的介面中。

## 進階設定摘要

在折疊面板外顯示目前已生效之進階設定的簡短文字，讓使用者不展開面板也能辨識輸出條件。

## 按需預覽

不在選檔或壓縮完成時自動載入媒體；僅在使用者明確要求時建立預覽所需資源。

## Blob URL

瀏覽器為記憶體中的 `Blob` 或 `File` 建立的本機 URL。使用完成後須撤銷，以釋放相關資源。

## MOV／QuickTime

Apple 常用的影片容器格式。能否壓縮不只取決於副檔名，還取決於其中的影片與音訊 codec 是否受瀏覽器支援。

## Codec

影音資料的編碼格式，例如 H.264、HEVC、AAC 或 ProRes；同一 MOV 容器可存放不同 codec。

## SemVer

語意化版本格式 `MAJOR.MINOR.PATCH`：不相容變更遞增 MAJOR、向下相容的新功能遞增 MINOR、向下相容的修正遞增 PATCH。

## 發布 tag

指向發布 commit 的 Git tag。本專案採 `vX.Y.Z` 格式，且 `X.Y.Z` 必須等於 `package.json` 的版本。

## Release notes

GitHub Release 頁面顯示的版本變更說明。本專案由 tag 對應的 `CHANGELOG.md` 版本段落自動產生。

## 持續部署

每次推送 `main` 即建置並更新 GitHub Pages；它與正式 Release 的 tag 觸發流程分開。

## 預發布版本

帶有 beta 或 rc 等識別碼的非正式版本，例如 `0.2.0-beta.1`。初期不由 Release workflow 處理。

## 可攜離線套件

附加於 GitHub Release 的 `MediaCompressor-Portable.exe`。它由同一份 Tauri 應用程式封裝而成，執行時暫存解壓並啟動，使用者無須安裝應用程式。

## 固定版 WebView2 runtime

與 Windows Tauri 應用程式一同散布的特定 WebView2 版本。它不依賴系統既有 runtime 或網路下載，適用於離線與 air-gapped 環境，但會明顯增加發行檔大小。

## NSIS 安裝版

以 NSIS 產生的 Windows 安裝程式 EXE。本專案以 `MediaCompressor-Setup.exe` 發行，由同一份 Tauri 應用程式建立，並與可攜離線套件功能一致。

## 版本化 PWA

由正式 `vX.Y.Z` tag 發行、位於專屬 GitHub Pages 路徑的 PWA。其 manifest、service worker 與快取範圍只對應該版本，因此不會隨 `main` 的線上預覽版更新。

## PWA 靜態檔 ZIP

附加於 GitHub Release 的版本化 PWA 建置檔。供內網或自有 HTTPS 網站部署；Chrome 不能直接由 ZIP 或 `file://` 路徑安裝它。

## 語意化 UI 元件

以用途命名且可重用的介面元件，例如按鈕、欄位、卡片與頁面版面。它們封裝 Tailwind utilities、狀態和 RWD 規則，避免各功能元件重複拼接樣式。

## Windows 首發支援範圍

本專案第一版桌面發行僅支援 Windows 10／11 x64；不支援 Windows 7／8 或 ARM64。

## 媒體相容性基線

在指定平台上承諾必須通過的媒體格式組合。本專案的 Windows Tauri 首發基線為 JPEG、PNG、WebP，以及 H.264/AAC MP4；其他 codec 依 WebView2 與裝置能力而定。

## PWA 版本並存

每個正式版本使用獨立的 PWA identity、start URL、service-worker scope 與快取名稱，因此可在同一裝置同時安裝。新版不會覆蓋或移除舊版，使用者自行升級與回退。

## 應用程式 shell 快取

PWA 為離線啟動預先保存的程式資產，例如 HTML、JS、CSS、Worker、字型與圖示。本專案不將使用者選取的媒體、輸出檔或預覽資料寫入此快取。

## 瀏覽器等級檔案權限

只讀取使用者透過檔案選擇器明確提供的檔案，並透過下載流程交付輸出；不授予應用程式任意本機路徑、shell 或原生檔案系統存取權。

## 發行平台

本專案唯一使用 GitHub：GitHub Release 提供固定版本資產與 checksum，GitHub Pages 提供網站、版本列表與下載入口。

## 發行目錄

由 Release workflow 產生的靜態 `releases.json`。GitHub Pages 以它顯示版本與固定下載 URL，不在瀏覽器端呼叫 GitHub API。

## 開啟並安裝 PWA

版本目錄的下載選項之一。它開啟指定版本的 GitHub Pages URL，再由使用者在該頁面觸發 Chrome 安裝流程；不是直接下載或強制安裝。

## 發布頻道

建置產物的來源類型。本專案區分正式 tag 的「正式版」與來自 `main` 的「預覽版」，並和版本號一起顯示在應用程式內。

## 版本與下載

GitHub Pages 的獨立畫面。它以發行目錄呈現正式版本與其 EXE、PWA、checksum、Release notes 和指定版本 PWA 安裝入口。

## 正式發行目錄

版本與下載畫面所列的固定 `vX.Y.Z` GitHub Release 集合。不包含 `main` 預覽版，並以最新發布版本優先排序。

## 自動重試任務

當壓縮結果超過目標容量時，由原任務衍生的可見佇列項目。每個原任務最多只會產生一個「自動重試 1/1」任務，並使用較低碼率處理。

## 取消中

使用者已要求停止目前任務，但處理器尚未回報中斷完成的暫態。完成後會轉為「已取消」或「已完成，取消未生效」。
