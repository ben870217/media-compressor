# ADR-0026：第一版 Windows EXE 不簽章，提供逐檔 SHA-256

## 狀態

已接受

## 背景

Tauri 安裝版與可攜版 EXE 可能被 Windows SmartScreen 顯示警告。Authenticode 簽章可改善系統信任，但需要憑證費用、CI secret 管理與簽章維運；目前尚未確定其成本能否由首發需求承擔。

## 決策

第一版不對 `MediaCompressor-Setup.exe` 與 `MediaCompressor-Portable.exe` 進行 Authenticode 簽章。Release workflow 為每個 EXE 個別產生 SHA-256 checksum，並在 README 與 Release notes 說明：僅從官方 GitHub Release 下載、可能看到 SmartScreen 警告，以及如何驗證 checksum。

待 Tauri 發布流程與需求穩定後，再評估導入程式碼簽章。

## 後果

- 首發不增加憑證成本與秘密管理。
- 使用者可能需要處理 SmartScreen 警告；checksum 可驗證檔案完整性與下載來源，但不能取代作業系統的程式簽章信任。
- 發布流程必須確保每個 EXE 的 checksum 與對應版本一同上傳，且不得覆寫既有 Release 資產。
