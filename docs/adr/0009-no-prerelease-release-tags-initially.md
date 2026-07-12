# ADR-0009：初期僅處理正式 Release tag

## 狀態

已接受

## 背景

預發布版本（beta、release candidate）需要額外的版本解析、CHANGELOG 與 GitHub prerelease 行為。現階段需求只涵蓋正式發布。

## 決策

初期 Release workflow 僅接受正式 SemVer tag：`vX.Y.Z`。不處理含預發布識別碼的 tag，例如 `v0.2.0-beta.1` 或 `v1.0.0-rc.1`。

## 後果

- tag 觸發條件、CHANGELOG 擷取與 GitHub Release 設定較單純。
- 若日後需要 beta 流程，須新增獨立 ADR 與 workflow 行為，而非讓其隱性套用正式發布流程。
