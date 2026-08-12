# Changelog

本檔案格式依循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)，並採用 [Semantic Versioning](https://semver.org/lang/zh-TW/)。詳細撰寫規則請見 [`docs/CHANGELOG_FORMAT.md`](docs/CHANGELOG_FORMAT.md)。

## [Unreleased]

## [0.3.0] - 2026-08-12

### Added
- 依據解析度、長寬比與影格率自動判定電腦螢幕錄影或手機錄影，並提供全域與單檔來源類型覆寫。
- 新增螢幕錄影來源與建議參數比較面板，顯示 FPS、Keyframe Interval、Bitrate Mode 與 Audio Bitrate。
- 針對電腦螢幕錄影加入原始解析度、30 FPS、5 秒 GOP、VBR 與 64 kbps 音訊的品質保留優化，以及疑似靜音提示。
- 新增 Docker、Playwright UI/E2E 驗收與 Pull Request quality gate，涵蓋 MOV、轉碼、取消、資源釋放與 RWD 流程。

### Fixed
- AAC encoder 不可用或實際重編碼失敗時，若輸出容器可直接封裝來源 AAC，保留原始音訊並顯示提示，避免靜默丟失音訊。
- AV1 encoder 實際失敗或設定不受支援時，自動退回 H.264 輸出並顯示提示。
- 影片與音訊並行轉碼其中一路失敗時，先收束背景 sample 處理再取消輸出，避免 `VideoSample` 未關閉。
- 修正部分影片或音訊解碼器產生負時間戳時，WebCodecs 拒絕影格或音訊而導致轉碼失敗。

### Changed
- 影片預設輸出編碼改為 AV1，並保留 H.264、H.265、VP9 與 AV1 選項。
- 原始與壓縮後媒體預覽改為按需載入，螢幕錄影參數比較面板預設收合。
- 正式 GitHub Release 改為只提供版本化 PWA ZIP，移除 Windows 桌面發行流程與相關下載連結。

## [0.2.0] - 2026-07-12

### Added
- 導入可安裝的 PWA 建置設定，正式建置會注入版本、頻道與專屬基底路徑。
- 在應用程式頂端顯示建置版本與發布頻道，並在瀏覽器支援時提供 PWA 安裝按鈕。
- 新增「版本與下載」畫面，從靜態發行目錄提供正式版本的 PWA、Windows 檔案、checksum 與 Release notes 連結。
- 新增 Windows Tauri 專案與僅限瀏覽器等級檔案權限的 capability 設定。
- 發布流程新增 Windows x64 Setup EXE、Portable EXE、各 EXE 的 SHA-256 checksum，以及版本化 PWA ZIP 的建置與上傳。
- 導入 Tailwind CSS v4，並將既有設計 token 對應至 Tailwind 主題。

### Changed
- Windows 離線交付改為同一份 Tauri 應用程式的安裝版與免安裝版，不再使用 Go、localhost 服務或 Chrome 啟動器。
- 正式 PWA 建置改為使用版本專屬名稱、manifest 與 service-worker 快取範圍，為多版本並存做好準備。

### Security
- Windows 桌面版維持最小 Tauri 權限，不啟用原生檔案系統、shell 或任意路徑存取。
- 未簽章的 Windows EXE 逐檔附加 SHA-256 checksum，供下載後驗證完整性。

## [0.1.0] - 2026-07-12

### Added
- Windows 可攜離線套件與本機 Chrome 啟動器的自動發布流程。
- 可按需開啟的原始與壓縮後媒體預覽。
- 版本、CHANGELOG 與 GitHub Release 的自動驗證及發布流程。

### Changed
- 將低頻壓縮選項收納至預設關閉的進階設定面板。

### Fixed
- 將 QuickTime MOV 加入影片轉碼器可辨識的輸入格式。
- 將超標影片壓縮改為可見且最多一次的自動重試任務，避免隱性重複處理。
- 取消目前任務時立即顯示狀態，並中斷影片轉碼或圖片 Worker 後繼續隊列。

## [0.0.0] - 2026-07-11

### Added
- 可在瀏覽器本機壓縮影片與照片，檔案不會上傳至伺服器。
- 影片目標檔案大小、解析度、影格率、輸出編碼、碼率與移除音訊等壓縮設定。
- H.264、H.265、VP9 與 AV1 影片輸出編碼選項，以及 JPEG 與 WebP 圖片輸出格式。
- 壓縮前後的媒體預覽、下載與實際輸出大小提示。
- 智慧碼率計算、解析度自動降階與超出目標容量警告。
- 瀏覽器相容性提示與本機壓縮歷程紀錄。
- 自動、淺色與深色主題，以及行動裝置適配介面。
