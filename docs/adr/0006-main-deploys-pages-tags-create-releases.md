# ADR-0006：main 部署 Pages，正式 tag 建立 Release

## 狀態

已接受

## 背景

現有 GitHub Actions workflow 在推送 `main` 時部署 GitHub Pages。新增 GitHub Release 後，需明確界定兩種 workflow 的責任與觸發條件。

## 決策

- GitHub Pages 保持於推送 `main` 時部署。
- 只有正式 `vX.Y.Z` tag 觸發 Release workflow。
- Release workflow 驗證 tag、package version 與 CHANGELOG 後，從 CHANGELOG 建立 GitHub Release。
- Release workflow 不負責部署 Pages。

## 後果

- 既有的持續部署行為不變。
- 建立或重推 tag 不會觸發額外的 Pages 部署。
- 線上版本可先於正式 Release 更新；Release 代表一個經明確標記的版本快照。
