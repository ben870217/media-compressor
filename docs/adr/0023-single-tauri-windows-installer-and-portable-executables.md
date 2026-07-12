# ADR-0023：以單一 Tauri 專案發行 Windows 安裝版與可攜版 EXE

## 狀態

已接受

## 背景

Windows 使用者同時需要可安裝版本與免安裝版本，但團隊不希望長期維護 Tauri 桌面程式和 Go／localhost／Chrome 啟動器兩套執行架構。既有可攜 ZIP 依賴使用者已安裝 Chrome，亦無法提供單一 EXE 的交付體驗。

## 決策

以同一份 React 前端、Tauri Rust 程式與版本號產生兩個 Windows Release 資產：

1. `MediaCompressor-Setup.exe`：Tauri NSIS 安裝程式。
2. `MediaCompressor-Portable.exe`：由 Release workflow 將同一份 Tauri 應用程式封裝為自解壓、免安裝的啟動檔；執行時解壓至暫存位置啟動，結束後清理。

兩個 EXE 都內含固定版本的 WebView2 runtime，確保在沒有網路且目標電腦未預先安裝 WebView2 時仍可首次啟動。這會使每個發行檔增加約 180 MB 的 runtime 體積。

移除 Go 啟動器、localhost 靜態網站服務與以 Chrome 作為 Windows 可攜版執行核心的流程。

## 後果

- Windows 只維護一套 Tauri 執行架構，兩種交付物的功能與版本保持一致。
- Tauri 內建支援 NSIS 安裝版；可攜 EXE 是額外的發布封裝步驟，需在 CI 驗證其解壓、啟動與清理行為。
- 每次更新 Tauri 或 WebView2 fixed runtime，都必須驗證媒體壓縮所需的 WebCodecs 與 codec 行為。
- Release 資產與下載體積增加，但符合本專案的離線、air-gapped 使用需求。
- 本決策取代 ADR-0013、ADR-0014、ADR-0015 與 ADR-0016 中關於 Go／Chrome 可攜版的決策。
