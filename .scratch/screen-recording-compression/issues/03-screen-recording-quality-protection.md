# 03 — 整合電腦螢幕錄影 1:1 點對點解析度與降階警示

**GitHub Issue:** [#3](https://github.com/ben870217/media-compressor/issues/3)

**What to build:**
當轉檔項目為 `screen` 時，預設採用 `longEdge: 'original'` 維持 1:1 點對點解析度並建議 30 FPS 降頻；若使用者手動調降解析度至低於原始長邊，介面即時顯示 `⚠️ 螢幕錄影降低解析度可能導致小字模糊` 黃色警示標語，並完成 end-to-end 轉檔與測試驗證。

**Blocked by:** [#2 02 — 實作 UI 全域與單檔來源類型切換器與建議標籤](https://github.com/ben870217/media-compressor/issues/2)

**Status:** ready-for-agent

- [ ] 轉檔為 `screen` 時預設套用 `longEdge: 'original'` 與 `fps: '30'`
- [ ] 在 `BatchCompressor.jsx` 的解析度選擇區呈現文字模糊警示訊息
- [ ] 驗證轉檔執行時 `processVideo` 正確傳遞長寬與 FPS 參數
- [ ] 執行轉檔測試與畫面 RWD 驗證
