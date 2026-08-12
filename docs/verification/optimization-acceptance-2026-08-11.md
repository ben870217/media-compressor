# 優化項目驗收紀錄（2026-08-11）

## 範圍

本紀錄盤點 2026-08-11 原始優化需求的四組範圍，並補上可重複的 UI／瀏覽器證據。程式碼對照基準為加入 Pull Request CI 前的 `HEAD 33ae659`，後續測試與文件變更均記錄於本工作樹；GitHub Issue #1～#15 均維持 `OPEN`，本次沒有修改遠端 issue 狀態。

## 驗證環境

- Docker service：`media-compressor-dev`
- Node：26.5.0
- Chromium：151.0.7922.108（Docker Alpine `/usr/bin/chromium`）
- ffmpeg：8.1.2（用於 fixture 產生）
- UI runner：Playwright `@playwright/test` 1.62.1
- fixture：`media-compressor/tests/fixtures/mac-h264-aac.mov`

fixture 是 320×180、30 FPS 的 QuickTime MOV，包含 H.264 影片與 AAC 48 kHz 立體聲音訊；`ffprobe` 確認封裝格式為 `mov,mp4,m4a,3gp,3g2,mj2`。

## 已執行的品質檢查

```text
npm run test:unit                                  34 passed, 0 failed
npm run lint                                      passed
npm run build                                     passed
npm run test:e2e                                  11 passed, 0 failed
npm audit --omit=dev                              0 vulnerabilities
```

Playwright UI/E2E 覆蓋：

1. 以 file picker 加入 H.264/AAC MOV，讀取 metadata 與來源類型建議。
2. 螢幕錄影參數比較面板預設收合，使用者展開後才顯示內容。
3. 原始影片預覽預設不建立 `<video>`，點擊後才載入 Blob URL。
4. 以公開的「移除音訊」選項完成 MOV 到可預覽 MP4 的 Chrome/Chromium 轉檔流程。
5. 模擬瀏覽器沒有 AAC encoder 時，保留來源 AAC packet 並完成可預覽 MP4 轉檔。
6. 模擬 AAC 在 capability detection 後實際拋出 `Encoding error`，確認退回來源 AAC packet；模擬 AV1 實際編碼失敗，確認退回 H.264 並顯示提示。
7. 驗證顯式 FPS、取消、編碼器不支援時的 VideoSample 資源釋放，以及 735、580、480 px viewport 沒有水平溢位。

## 尚未能宣稱完成的部分

Docker Alpine Chromium 回報目前 AAC `AudioEncoder` 組合不支援（包括 2 聲道／48 kHz 案例）。產品會先偵測設定；若 MP4 可直接容納來源 AAC，便複製 encoded packet、保留音訊並在結果提示「已保留原始音訊」；即使 capability detection 誤判可用、實際編碼失敗，也會走相同 fallback。AV1 實際編碼失敗時則退回 H.264 並提示。仍需在支援 AAC encoder 的桌面 Chrome／實際目標裝置上補驗 64 kbps 音訊重新編碼路徑。

in-app Browser connector 在本次環境沒有可用 browser session，因此沒有把 connector 狀態冒充為 E2E 證據；本紀錄的 UI 證據來自 Docker 內 Playwright Chromium。

## Pull Request CI

`.github/workflows/ci.yml` 將上述 unit、lint、build 與 E2E 命令組成 `quality-gate` required job。CI 使用 Node 26、Ubuntu runner 與 Playwright 管理的 Chromium；本機 Docker 則透過 `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium` 使用 system Chromium。失敗時的 Playwright artifacts 保存 14 天。

GitHub `main` branch protection 已設定 `quality-gate` 為 strict required status check，且啟用 administrator enforcement；設定已透過 GitHub API read-back 確認。
