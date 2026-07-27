# 02 — 實作 UI 全域與單檔來源類型切換器與建議標籤

**GitHub Issue:** [#2](https://github.com/ben870217/media-compressor/issues/2)

**What to build:**
在 `BatchCompressor.jsx` 介面上方新增全域切換 Segmented Control（`📱 手機錄影` / `💻 電腦螢幕錄影`），並在批次清單每個影片項目加上系統自動判定的 `✨ 系統建議` 標籤與 1-click 切換按鈕，允許使用者自由調整個別項目的 `sourceType` 覆蓋設定。

**Blocked by:** [#1 01 — 新增影片來源類型與啟發式自動判定邏輯](https://github.com/ben870217/media-compressor/issues/1)

**Status:** ready-for-agent

- [ ] 在 `BatchCompressor.jsx` 頂部控制面板加入全域 `sourceType` 切換選單
- [ ] 影片加入佇列時調用 `detectVideoSourceType` 填入 `detectedSourceType`
- [ ] 在檔案項目卡片上顯示系統建議標籤與 1-click 模式切換鈕
- [ ] 支援單檔 `overrides.sourceType` 設定
