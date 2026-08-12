# SPEC-0001: 電腦螢幕錄影與手機錄影之差異化壓縮功能規格書

## Problem Statement

使用者在使用本媒體壓縮工具處理 OBS 或電腦畫面錄影（電腦螢幕錄影）時，二次壓縮產生的影片品質極差。現有機制針對手機相機拍攝之動態影片設計，在位元率不足時會自動降低解析度（例如從 1080p 降至 720p/480p）。然而對於包含諸多程式碼、文字、簡報或介面細節的電腦螢幕錄影，降低解析度會直接導致文字與畫面細節嚴重模糊失真，無法滿足清晰閱讀與展示的需求。

## Solution

針對「手機錄影 (Mobile Video)」與「電腦螢幕錄影 (Screen Recording)」導入差異化壓縮策略與自動判定機制：
1. **自動判定與手動覆蓋**：於影片載入時自動根據解析度、長寬比（如直式 9:16 或超寬螢幕 21:9/16:10）以及影格率（如 1080p 16:9 且為 60 FPS 的 OBS 錄影）推估影片來源類型，並於批次佇列與介面上方提供 1-click 切換選單。
2. **電腦螢幕錄影專屬品質保護**：
   - 預設採用 1:1 點對點原始解析度（`longEdge: 'original'`），保護文字與介面細節銳利度。
   - 優先降低影格率（如從 60 FPS 降至 30 FPS）以節省 40%–50% 檔案容量，同時維護單張圖幀畫質。
   - 若使用者強制調降解析度，顯示警示標籤（`⚠️ 螢幕錄影降低解析度可能導致小字與細節模糊`）。
3. **全域預設格式與自由選擇**：
   - 預設影片輸出編碼統一調整為 **AV1**。
   - 允許使用者自由選擇專案與瀏覽器支援的影片輸出編碼格式（H.264/AVC, AV1, WebM/VP9 等）。

## User Stories

1. As a developer recording coding tutorials with OBS, I want the compressed video to retain 1:1 native resolution and sharp text, so that my audience can clearly read code editor text.
2. As a content creator uploading desktop screen capture videos, I want the system to automatically detect screen recording formats based on screen resolution, aspect ratio, and frame rate (e.g. 1080p60 OBS recordings), so that I don't need to manually configure complex video compression settings.
3. As a mobile phone video shooter, I want my camera videos to continue using standard bitrate downscaling and resolution optimization, so that my video files remain compact for instant sharing.
4. As a user processing a batch of mixed videos (mobile camera and desktop screen recordings), I want to see an explicit system recommendation badge on each file card, so that I know which compression preset is applied to each item.
5. As a user processing a batch of mixed videos, I want to be able to override the source type for individual files with a single click, so that I have full control over the compression mode for edge-case files.
6. As a user choosing to lower the resolution of a screen recording, I want to see a clear visual warning about potential text blurriness, so that I am aware of the quality trade-off before starting compression.
7. As a desktop screen recorder, I want the compression preset to recommend reducing frame rate from 60 FPS to 30 FPS, so that I can achieve significantly smaller file sizes without sacrificing text clarity.
8. As a video creator using next-gen codecs, I want the compressed videos to default to AV1 output while retaining the ability to choose other supported output formats (such as H.264/AVC or WebM), so that I have full flexibility depending on my playback target.

## Implementation Decisions

- **影片來源類型定義 (Video Source Type)**:
  - 導入 `sourceType` 欄位（可選值：`mobile` 與 `screen`）。
  - 啟發式判定邏輯 `detectVideoSourceType({ width, height, fps })`：
    - `height > width` ➔ `mobile`
    - `width / height >= 2.0`（超寬螢幕 21:9/32:9）、`16:10` 顯示器比例、`width >= 2560px` 或 **16:9 且 60 FPS 橫向影片（如 OBS 錄影）** ➔ `screen`
    - 其餘 16:9 橫向影片 ➔ 預設 `mobile` 並於 UI 標註建議按鈕。
- **媒體設定與編碼預設 (`mediaSettings`)**:
  - `defaultSettings('video')` 包含 `sourceType` 設定，且預設影片輸出格式設定為 `av1`。
  - 支援使用者於選單中自由選擇專案與瀏覽器支援之影片輸出編碼格式（H.264/AVC, AV1, WebM/VP9 等）。
  - `outputDimensions()` 支援 `longEdge: 'original'`，當為螢幕錄影且設為原始解析度時不進行縮放。
- **批次轉檔介面擴充 (`BatchCompressor`)**:
  - 頂部提供全域來源切換 Segmented Control（`📱 手機錄影` / `💻 電腦螢幕錄影`）。
  - 單檔佇列清單顯示來源類型切換鈕與 `✨ 系統建議` 標籤。
  - 螢幕錄影模式下，若 `longEdge` 小於原始尺寸，顯示警示標籤 `⚠️ 螢幕錄影降低解析度可能導致小字與細節模糊`。

## Testing Decisions

- **測試接縫 (Testing Seam)**:
  - **核心計算與啟發式純函式接縫 (`mediaSettings`)**:
    使用高階純函式接縫 `detectVideoSourceType` 與 `outputDimensions` 進行單元測試。測試聚焦於外部行為（External Behavior），涵蓋多種解析度與 FPS 組合（1080p 30fps 手機影片、1080p 60fps OBS 螢幕錄影、4K 螢幕錄影 3840x2160、21:9 螢幕錄影 3440x1440）的正確分類與 1:1 尺寸計算。
  - **測試範例與命令**:
    執行 `docker exec -w /app/media-compressor media-compressor-dev npm run test:unit`。
  - **瀏覽器驗收**:
    執行 `docker exec -w /app/media-compressor media-compressor-dev npm run test:e2e`，使用 `tests/fixtures/mac-h264-aac.mov` 驗證 MOV metadata、來源建議、預覽與 Chrome/Chromium 轉檔流程。AAC encoder 能力仍依瀏覽器 build 而異。

## Out of Scope

- 針對特定應用程式視窗進行自動 OCR 文字分析。
- 專用 H.265 軟體 CRF 碼率控制（維護本機瀏覽器 WebCodecs 硬體編碼相容性）。

## Further Notes

- 搭配相關架構決策紀錄：[ADR 0001](file:///c:/Users/n0978/OneDrive/桌面/work_git/private_github/media-compressor/docs/adr/0001-screen-recording-compression-strategy.md)。
- 搭配專案領域詞彙表：[CONTEXT.md](file:///c:/Users/n0978/OneDrive/桌面/work_git/private_github/media-compressor/CONTEXT.md)。
