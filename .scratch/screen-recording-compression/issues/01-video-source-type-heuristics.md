# 01 — 新增影片來源類型與啟發式自動判定邏輯

**GitHub Issue:** [#1](https://github.com/ben870217/media-compressor/issues/1)

**What to build:**
在 `mediaSettings.js` 中新增 `sourceType` 欄位與 `detectVideoSourceType({ width, height })` 啟發式判定函式。當解析度為直式（Height > Width）時歸類為 `mobile`；當長寬比為超寬螢幕（21:9, 32:9）、16:10、或寬度 $\ge 2560px$ 時自動歸類為 `screen`。為 `mobile`（長邊預設 1080p）與 `screen`（長邊預設原始長度、預設 30 FPS）設定差異化預設值，並撰寫純函式單元測試驗證判定與尺寸計算邏輯。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 在 `mediaSettings.js` 實作 `detectVideoSourceType({ width, height })` 純函式
- [ ] 擴充 `defaultSettings('video')` 包含 `sourceType: 'auto'`
- [ ] 擴充 `outputDimensions()` 當 `sourceType === 'screen'` 且 `longEdge === 'original'` 時保持點對點 1:1 不縮放
- [ ] 完成 `mediaSettings` 的測試與驗證
