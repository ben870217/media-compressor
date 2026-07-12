# ADR-0012：每個正式 tag 的 Release 不可覆寫

## 狀態

已接受

## 背景

重新執行 workflow 或修改既有 Release notes 可能令 Git tag、CHANGELOG 與 GitHub Release 的內容失去一對一對應，降低可稽核性。

## 決策

每個正式 `vX.Y.Z` tag 只能建立一次 GitHub Release。若同 tag 的 Release 已存在，workflow 必須失敗，不覆寫其 notes。發布後需要修正時，建立新的 PATCH 版本。

## 後果

- 已發布版本的變更說明保持穩定且可追溯。
- 發布人必須在推送 tag 前檢查 CHANGELOG。
- 小型修正仍需要新的版本與 Release。
