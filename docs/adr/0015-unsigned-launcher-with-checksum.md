# ADR-0015：初期發行未簽署啟動器並提供 SHA-256

## 狀態

已接受

## 背景

Windows SmartScreen 可能對未簽署 EXE 顯示安全提示。Authenticode 簽章可改善體驗，但需要憑證費用、秘密管理與持續維護。

## 決策

第一版 Windows 啟動器不進行程式碼簽章。Release workflow 額外產生並附加 ZIP 的 SHA-256 checksum；README 說明只從官方 GitHub Release 下載，以及如何比對 checksum。當離線版需求穩定後，再評估導入 Authenticode。

## 後果

- 初期不增加憑證成本與 CI secret 管理。
- 部分使用者首次執行仍可能遇到 SmartScreen，README 必須預先說明。
- Checksum 提供下載完整性與來源驗證，但不能取代程式碼簽章的系統信任。
