# ADR-0004：以 package.json 的 SemVer 版本與相符 Git tag 發布

## 狀態

已接受

## 背景

專案需要可追溯的版本、變更紀錄與自動化 GitHub Release；若版本存在多個來源，發布內容容易與標記脫鉤。

## 決策

- 採用語意化版本（SemVer）：`MAJOR.MINOR.PATCH`。
- `media-compressor/package.json` 的 `version` 是唯一版本來源。
- 發布 tag 必須是同一版本加上 `v` 前綴，例如 package version `1.2.3` 對應 Git tag `v1.2.3`。
- 發布 workflow 在建立 Release 前驗證 tag 與 package version 完全一致；不一致時失敗。
- `README.md` 必須說明升版、更新 `CHANGELOG.md`、提交與建立 tag 的流程。

## 後果

- 可由 package metadata、Git history 與 GitHub Release 相互驗證版本。
- 發布人必須先完成版本與 CHANGELOG 的更新，才能建立正確 tag。
- workflow 需內含版本比對，防止錯誤發布。
