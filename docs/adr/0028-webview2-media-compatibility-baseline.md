# ADR-0028：Tauri 首發以通用圖片與 H.264/AAC MP4 作為媒體相容性基線

## 狀態

已接受

## 背景

Tauri on Windows 使用 WebView2，實際可用的 WebCodecs、解碼器與編碼器仍可能受 runtime、作業系統與裝置硬體影響。現有瀏覽器版可顯示多種 codec 選項，但不能將其全部視為跨裝置的保證。

## 決策

Windows Tauri 首發的保證驗收範圍為：

- JPEG、PNG、WebP 圖片的壓縮。
- 含 H.264 視訊與 AAC 音訊的 MP4 影片壓縮。

MOV、HEVC、AV1、VP9 及其他依裝置或 runtime 而定的 codec，維持可選／可嘗試的能力；必須先偵測相容性，無法處理時顯示明確錯誤，不得靜默失敗或宣稱支援。

## 後果

- Windows 10／11 x64 的驗收與回歸測試至少涵蓋上述保證格式。
- UI 與 README 必須區分「保證範圍」與「依裝置能力而定」的格式。
- WebView2 或 Tauri 更新時，需重新驗證基線格式及相容性失敗流程。
