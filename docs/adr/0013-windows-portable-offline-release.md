# ADR-0013：以 Windows 可攜套件提供離線使用

## 狀態

已接受

## 背景

GitHub Release 除了變更說明外，使用者需要可下載、無網路也能使用的版本。直接以 `file://` 開啟 Vite 的 `index.html` 不可靠，因為應用程式使用模組、Web Worker 與部署用 base path。

## 決策

每個正式 Release 附加 Windows 可攜 ZIP。ZIP 內含建置後的網站檔案與啟動器：

1. 使用者解壓縮 ZIP。
2. 使用者雙擊啟動器。
3. 啟動器於本機 `localhost` 提供網站檔案。
4. 啟動器以已安裝的 Google Chrome 開啟應用程式。

此流程全程不依賴網路；目標平台為 Windows 且需已安裝 Chrome。

## 後果

- Release workflow 必須產生並附加 ZIP，不再是 notes-only Release。
- 啟動器與網站資源須一起散布，使用者不能只雙擊 `index.html`。
- 需考量 Windows 對未簽署 EXE 的安全提示，並在 README 說明解壓與啟動方式。
- 離線版以 Chrome 為運行與相容性目標，不承諾其他瀏覽器。
