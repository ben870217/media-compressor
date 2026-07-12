# ADR-0014：使用 Go 啟動器，並在 README 說明離線發行流程

## 狀態

已接受

## 背景

Windows 可攜離線套件需要一個不依賴使用者安裝 Node.js 或 .NET 的啟動器。使用者也需要在 README 找到製作、發布與使用離線版的方式。

## 決策

- 使用 Go 製作 Windows 啟動器，GitHub Actions 在 Windows runner 編譯成單一 EXE。
- 啟動器負責選取本機空閒 port、提供靜態檔案、尋找並以 Chrome 開啟網址，並在結束時停止伺服器。
- README 必須記錄離線套件的內容、使用者解壓與啟動步驟，以及維護者建置／發布流程。

## 後果

- 專案新增 Go 原始碼、Windows 編譯步驟與 ZIP 組裝流程。
- 使用者不需安裝開發工具，即可離線使用應用程式。
- README 是使用與發布離線版的主要說明入口，須與 workflow 保持同步。
