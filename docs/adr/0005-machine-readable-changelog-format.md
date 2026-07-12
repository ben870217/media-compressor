# ADR-0005：以固定版本段落作為 Release notes 來源

## 狀態

已接受

## 背景

GitHub Release 必須從 `CHANGELOG.md` 自動擷取正確版本的變更內容；自由格式無法可靠辨識範圍與分類。

## 決策

根目錄 `CHANGELOG.md` 採用精簡的 Keep a Changelog 格式：

```md
# Changelog

## [Unreleased]

## [1.2.3] - 2026-07-12

### Added
- ...
```

- 每個已發布版本標題必須是 `## [X.Y.Z] - YYYY-MM-DD`。
- 發布 workflow 以 tag 的 `X.Y.Z` 精確找出對應版本標題，並擷取該標題到下一個二級標題之間的內容。
- 分類僅可使用 `Added`、`Changed`、`Deprecated`、`Removed`、`Fixed`、`Security`；空分類不寫入。
- `Unreleased` 區塊只放下一個版本尚未發布的變更，不能被當成 Release notes。

## 後果

- Release notes 的產生可重現且不需人工複製貼上。
- 發布前必須先將 `Unreleased` 的項目移入正確版本段落並填上日期。
- 不符合標題格式或缺少 tag 對應段落時，workflow 應失敗而非建立空白 Release。
