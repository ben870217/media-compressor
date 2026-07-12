# ADR-0032：GitHub 是唯一的發布與 Pages 平台

## 狀態

已接受

## 背景

專案目前的遠端、Release workflow 與靜態網站均位於 GitHub。需求中的「GitLab Release／GitLab Page」為筆誤；同時維護兩個平台會造成版本清單、資產連結與不可變 Release 的來源不一致。

## 決策

GitHub Release 是 Windows EXE 與 PWA ZIP 的唯一發行來源，GitHub Pages 是唯一的線上入口與版本列表呈現位置。不導入 GitLab CI、GitLab Release 或 GitLab Pages。

## 後果

- 版本列表中的下載連結必須指向對應 GitHub Release 的固定資產。
- 發布 workflow 與 Pages 部署必須共享同一個 SemVer tag 作為版本識別。
- 使用者可從 GitHub Pages 選擇版本，但下載、checksum 與 Release notes 的權威來源仍是 GitHub Release。
