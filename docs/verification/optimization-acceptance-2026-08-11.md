# 優化項目驗收紀錄（2026-08-11）

## 範圍

本紀錄盤點 `優化.md` 的四組需求，並補上目前缺少的可重複 UI／瀏覽器證據。程式碼對照基準為 `HEAD ecfe64a` 加上本工作樹的測試與文件變更；GitHub Issue #1～#15 均維持 `OPEN`，本次沒有修改遠端 issue 狀態。

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
node src/utils/__tests__/mediaSettings.test.mjs   31 passed, 0 failed
npm run lint                                      passed
npm run build                                     passed
npm run test:e2e                                  5 passed, 0 failed
npm audit --omit=dev                              0 vulnerabilities
```

Playwright UI/E2E 覆蓋：

1. 以 file picker 加入 H.264/AAC MOV，讀取 metadata 與來源類型建議。
2. 螢幕錄影參數比較面板預設收合，使用者展開後才顯示內容。
3. 原始影片預覽預設不建立 `<video>`，點擊後才載入 Blob URL。
4. 以公開的「移除音訊」選項完成 MOV 到可預覽 MP4 的 Chrome/Chromium 轉檔流程。
5. 在 735、580、480 px viewport 檢查沒有水平溢位，並確認 480 px 時來源切換器改為直向排列。

## 尚未能宣稱完成的部分

Docker Alpine Chromium 回報目前 AAC `AudioEncoder` 組合不支援（包括 2 聲道／48 kHz 案例）。因此產品保留「不支援時顯示錯誤、不可靜默丟音訊」的行為；本紀錄只把「移除音訊後的 MOV 轉 MP4」列為已驗證，沒有把保留 AAC 音訊的跨環境轉碼誤記為完成。仍需在支援該 AAC encoder 的桌面 Chrome／實際目標裝置上補驗。

in-app Browser connector 在本次環境沒有可用 browser session，因此沒有把 connector 狀態冒充為 E2E 證據；本紀錄的 UI 證據來自 Docker 內 Playwright Chromium。
