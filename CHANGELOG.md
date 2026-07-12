# Changelog

本檔案格式依循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)，並採用 [Semantic Versioning](https://semver.org/lang/zh-TW/)。詳細撰寫規則請見 [`docs/CHANGELOG_FORMAT.md`](docs/CHANGELOG_FORMAT.md)。

## [Unreleased]

## [0.1.0] - 2026-07-12

### Added
- Windows 可攜離線套件與本機 Chrome 啟動器的自動發布流程。
- 可按需開啟的原始與壓縮後媒體預覽。
- 版本、CHANGELOG 與 GitHub Release 的自動驗證及發布流程。

### Changed
- 將低頻壓縮選項收納至預設關閉的進階設定面板。

### Fixed
- 將 QuickTime MOV 加入影片轉碼器可辨識的輸入格式。

## [0.0.0] - 2026-07-11

### Added
- 可在瀏覽器本機壓縮影片與照片，檔案不會上傳至伺服器。
- 影片目標檔案大小、解析度、影格率、輸出編碼、碼率與移除音訊等壓縮設定。
- H.264、H.265、VP9 與 AV1 影片輸出編碼選項，以及 JPEG 與 WebP 圖片輸出格式。
- 壓縮前後的媒體預覽、下載與實際輸出大小提示。
- 智慧碼率計算、解析度自動降階與超出目標容量警告。
- 瀏覽器相容性提示與本機壓縮歷程紀錄。
- 自動、淺色與深色主題，以及行動裝置適配介面。
