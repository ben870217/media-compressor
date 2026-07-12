# ADR-0008：建立 Release 前執行建置與靜態檢查

## 狀態

已接受

## 背景

正式 GitHub Release 應只指向可由鎖定依賴完成建置、且通過既有靜態檢查的 commit。現有專案未定義自動測試腳本。

## 決策

Release workflow 依序執行：

1. `npm ci`
2. `npm run lint`
3. `npm run build`
4. 驗證 Git tag、`package.json` version 與 `CHANGELOG.md` 版本段落相符
5. 建立 GitHub Release

任一步驟失敗時，workflow 不得建立 Release。未建立自動測試腳本前，不新增空的測試步驟。

## 後果

- Release 指向的 commit 至少可被乾淨安裝、lint 與建置。
- 發布時間略增加，但避免發行明顯損壞的版本。
- 未來新增測試腳本時，應把它加入此品質閘門。
