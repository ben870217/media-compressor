# ADR-0027：Windows 首發僅支援 Windows 10／11 x64

## 狀態

已接受

## 背景

Tauri 安裝版與可攜版都需要對應目標平台的 Rust binary、fixed WebView2 runtime、自解壓封裝及媒體壓縮驗證。一次提供 x64、ARM64 與舊版 Windows 會明顯擴大發布與測試矩陣。

## 決策

第一版僅發行並支援 Windows 10／11 x64 的 `MediaCompressor-Setup.exe` 與 `MediaCompressor-Portable.exe`。不支援 Windows 7／8，且不提供 ARM64 資產。

## 後果

- CI 只需建置、封裝並驗證一組 Windows x64 資產。
- README 與 Release notes 必須明確列出最低系統需求。
- ARM64 或舊版 Windows 的需求出現時，須新增對應 runtime、封裝和測試，而不是將 x64 檔案標示為相容。
