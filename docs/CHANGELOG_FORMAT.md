# CHANGELOG 撰寫規範

`CHANGELOG.md` 是 GitHub Release notes 的唯一文字來源。發布工作流程只會擷取與 tag 相符的版本區塊。

## 版本區塊

```md
## [1.2.3] - 2026-07-12
```

- 版本必須與 `media-compressor/package.json` 的 `version` 完全相同。
- 日期使用 ISO 格式 `YYYY-MM-DD`。
- 對應 Git tag 必須是 `v1.2.3`。

## 允許的分類與範例

```md
## [Unreleased]

### Added
- 可按需開啟的壓縮前後媒體預覽。

### Fixed
- 讀取常見 macOS QuickTime MOV 檔案。

## [1.2.3] - 2026-07-12

### Changed
- 將低頻壓縮選項收納至進階設定。
```

只使用以下英文分類標題：`Added`、`Changed`、`Deprecated`、`Removed`、`Fixed`、`Security`。沒有項目的分類不要建立。每個項目使用一句以使用者或維護者可理解的繁體中文描述。

## 發布前檢查

1. 將 `Unreleased` 的項目移至新的 `## [X.Y.Z] - YYYY-MM-DD` 區塊。
2. 確認版本與 `package.json` 相同。
3. 提交 CHANGELOG 與版本變更。
4. 在該 commit 建立 `vX.Y.Z` tag 並推送。

第一個正式發布版本為 `0.1.0`，對應 tag 為 `v0.1.0`。
