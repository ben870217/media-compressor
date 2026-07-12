# ADR-0007：首次正式 Release 使用 v0.1.0

## 狀態

已接受

## 背景

目前 package version 是 `0.0.0`，但專案尚未建立正式 GitHub Release。需要一個符合目前成熟度的起始 SemVer 版本。

## 決策

完成目前優化項目後，第一個正式 Release 將使用 package version `0.1.0` 與 Git tag `v0.1.0`。

## 後果

- CHANGELOG 的第一個已發布版本段落為 `## [0.1.0] - <發布日期>`。
- 專案明確維持在 0.x 的早期演進階段，不宣告 1.0 的穩定性承諾。
