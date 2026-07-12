# ADR-0003：支援可於瀏覽器解碼的 QuickTime MOV 輸入

## 狀態

已接受

## 背景

介面允許選取 `.mov`，但影片轉碼器未將 QuickTime/MOV 格式交給 Mediabunny 解析，導致 macOS 輸出的 MOV 無法讀取。MOV 是容器格式，實際可否處理仍取決於其 codec 與使用者瀏覽器的解碼能力。

## 決策

- 將 QuickTime/MOV 輸入格式加入影片轉碼器。
- 支援可由執行中瀏覽器解碼的常見 macOS MOV，包含 H.264 與 HEVC。
- 統一輸出 H.264/AAC MP4。
- 遇到不受支援的來源 codec 或裝置解碼能力時，顯示明確的相容性錯誤與建議，不宣稱支援所有 Apple codec。

## 後果

- 常見 macOS 影片可加入既有壓縮流程。
- ProRes 等來源是否可處理不構成產品承諾，需由實際瀏覽器能力決定。
- 錯誤訊息必須區分容器讀取失敗與 codec 不相容，讓使用者能採取行動。
