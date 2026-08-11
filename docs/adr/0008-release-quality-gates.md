# ADR-0008：建立 Release 前執行建置與靜態檢查

## 狀態

已接受

## 背景

正式 GitHub Release 應只指向可由鎖定依賴完成建置、且通過既有靜態檢查的 commit。專案目前另有以 Docker Chromium 執行的瀏覽器驗收腳本，但其結果會受瀏覽器 codec 能力與執行環境影響。

## 決策

Release workflow 依序執行：

1. `npm ci`
2. `npm run lint`
3. `npm run build`
4. 驗證 Git tag、`package.json` version 與 `CHANGELOG.md` 版本段落相符
5. 建立 GitHub Release

`npm run test:e2e` 是瀏覽器敏感功能（例如 MOV、預覽與 RWD）的驗收命令，應在相關變更交付前於 Docker 環境執行並保存結果。現行 tag workflow 仍維持 lint/build/version gates，不把特定 Chromium/AAC encoder 的結果誤當成所有平台的 Release 保證。

任一步驟失敗時，workflow 不得建立 Release。未建立自動測試腳本前，不新增空的測試步驟。

## 後果

- Release 指向的 commit 至少可被乾淨安裝、lint 與建置。
- 發布時間略增加，但避免發行明顯損壞的版本。
- 瀏覽器驗收會提高對 MOV 與 UI 變更的信心，但不取代目標裝置上的 codec 相容性驗證。
