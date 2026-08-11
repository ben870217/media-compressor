# SPEC-0002: 電腦螢幕錄影無損品質進一步壓縮優化規格書

## Problem Statement

在使用本媒體壓縮工具處理 60 FPS 的 AV1 / H.264 電腦螢幕錄影（如 OBS 畫面錄製、程式碼寫作教學、桌面簡報展示）時，預設的固定位元率 (CBR)、高幀率 (60 FPS) 以及短關鍵影格間隔 (GOP) 會產生大量無效資料，導致輸出檔案過大。使用者需要一套能在完全不損減文字與介面視覺銳利度 (1:1 點對點畫質) 的前提下，大幅降低檔案容量的自動化優化機制，並能在 UI 上清晰對比「來源設定」與「調整後建議設定」。

## Solution

針對「電腦螢幕錄影 (Screen Recording)」導入 4 大無損品質壓縮優化策略與透明化 UI 對比控制：
1. **影格率優化 (30 FPS Default)**：螢幕錄影自動降至 30 FPS，省下 40%–50% 容量，同時每幀獲得雙倍碼率分配；UI 顯性展示來源 60 FPS 降至 30 FPS 建議，並提供 1-click 切換恢復 60 FPS 選單。
2. **關鍵影格間隔優化 (5-Second GOP)**：預設將關鍵影格間隔延長至 5 秒 (`keyframeInterval: 5`)，大幅減少大體積 I-Frame 數量；UI 明確標示來源 GOP 與建議 5 秒設定。
3. **動態位元率模式 (VBR Bitrate Mode)**：預設啟用 `bitrateMode: 'variable'`，於靜態桌面自動調降碼率、動態區域補足碼率，省下 20%–35% 容量且畫質無損；UI 顯性對比來源位元率模式與 VBR 模式。
4. **音訊軌道優化 (64kbps Voice Audio & Suspected-Silence Detection)**：預設音訊碼率調降至 64 kbps (語音最佳化)，有限取樣未偵測到聲音時跳出「疑似靜音，建議檢查後移除」提示；UI 清晰對比來源與調整後音訊碼率。

## User Stories

1. As a developer recording coding tutorials with OBS, I want high-fps screen recordings to automatically default to 30 FPS with a 5-second keyframe interval, so that file sizes are cut by over 50% while code text remains 100% sharp.
2. As a user reviewing video queue items, I want the UI item card to display an explicit side-by-side comparison of original video parameters vs recommended optimized parameters (FPS, Keyframe Interval, Bitrate Mode, Audio Bitrate), so that I understand exactly what changes are being applied.
3. As a creator processing desktop recordings, I want the system to encode videos using Variable Bitrate (`bitrateMode: 'variable'`), so that silent static code editor screens don't waste unnecessary bitrate.
4. As a user recording software demos without audio, I want the system to flag audio tracks that appear silent in sampled timestamps and suggest checking before stripping the audio stream, so that I can save extra megabytes without an overconfident detection claim.
5. As a user who requires high frame rate playback for gaming screen captures, I want to easily toggle back to original 60 FPS or CBR mode via the UI override controls, so that I retain full flexibility for edge cases.

## Implementation Decisions

- **影格率控制 (`frameRate`)**:
  - 當 `sourceType === 'screen'` 且來源影格率為高 FPS (例如 60 FPS) 時，預設套用 `30 FPS`。
  - UI 提供 1-click 切換按鈕恢復原始 FPS。
- **關鍵影格間隔 (`keyframeInterval`)**:
  - 在 `processVideo` 中傳遞 `keyframeInterval: 5` 給 `mediabunny` Conversion 規格。
- **變動位元率模式 (`bitrateMode`)**:
  - 在 `processVideo` 的 video 配置中加入 `bitrateMode: 'variable'`。
- **音訊軌道優化 (`audio`)**:
  - 螢幕錄影預設音訊碼率調整為 `64000` (64 kbps)。
  - 於 `videoMeta` 以有限時間點取樣判定「疑似靜音」，僅跳出提示供使用者檢查後移除音訊，不宣稱整條軌道全程無聲。
- **UI 對比與透明度 (Source vs Target Comparison UI)**:
  - 檔案佇列卡片呈現「來源參數 (如 60 FPS / CBR / 128k)」與「建議優化參數 (30 FPS / VBR / 64k)」對比面板與重設/覆寫開關。

## Testing Decisions

- **測試接縫 (Testing Seam)**:
  - 使用核心純函式接縫 `mediaSettings` 與 `BatchCompressor` 的 `effective(item)` 計算邏輯進行單元測試。測試聚焦於外部行為：當 `sourceType === 'screen'` 時，`effective()` 正確輸出 `keyframeInterval: 5`、`bitrateMode: 'variable'`、`fps: '30'` 與 `audioBitrate: 64000`。
- **測試範例與命令**:
  - 執行 `docker exec -w /app/media-compressor media-compressor-dev npm run test:unit`。
  - 執行 `docker exec -w /app/media-compressor media-compressor-dev npm run test:e2e`，驗證螢幕模式比較面板預設收合、來源預覽按需載入，以及 735/580/480 RWD。測試同時覆蓋以公開「移除音訊」選項完成 MOV 到 MP4 的 Chrome/Chromium 轉檔；目前 Alpine Chromium 不支援本案例的 AAC WebCodecs encoder 組合，因此不把該環境誤記為保留音訊已驗收。

## Out of Scope

- 針對視訊進行多通過 (2-pass) 重複二次編碼。
- 專用外掛 H.265 / AV1 CRF 常數品質參數微調。

## Further Notes

- 搭配相關架構決策紀錄：[ADR 0039](file:///c:/Users/n0978/OneDrive/桌面/work_git/private_github/media-compressor/docs/adr/0039-screen-recording-quality-preserving-optimization.md)。
- 搭配專案領域詞彙表：[CONTEXT.md](file:///c:/Users/n0978/OneDrive/桌面/work_git/private_github/media-compressor/CONTEXT.md)。
