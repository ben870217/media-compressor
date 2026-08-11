# ADR-0041：Pull Request 必須通過完整品質閘門

## 狀態

已接受

## 背景

目前 lint、production build、純函式測試與 Playwright UI/E2E 驗收分散在本機命令；若只靠開發者手動執行，Pull Request 可能在未驗證主要流程的情況下合併。GitHub Pages deploy 與 tag Release 也有各自的觸發條件，不應取代合併前品質檢查。

## 決策

- 新增獨立 CI workflow，對所有 `pull_request` 執行，並提供 `workflow_dispatch` 手動觸發。
- workflow 的 required job 使用穩定名稱 `quality-gate`。
- workflow 使用 Node 26 與單一 `ubuntu-latest` runner。
- 品質閘門以 sequential steps 執行 unit test、lint、production build 與 Playwright UI/E2E。
- CI 使用 Playwright 管理的 Chromium；測試失敗時上傳 screenshot、trace 與 error context artifacts。
- 失敗 artifacts 保存 14 天；成功執行不保存額外 artifacts。
- 同一 Pull Request 的新 commit 會取消舊的品質閘門執行，只保留最新 run。
- workflow 權限限制為 `contents: read`。
- `main` 的 branch protection／ruleset 將 `quality-gate` 設為 required status check；檢查失敗或尚未完成時不得合併。
- Pages deploy 只負責 `main` 部署，tag Release 只負責正式發布，兩者不取代 Pull Request 品質閘門。

## 後果

- 每個 Pull Request 都有一致且可追蹤的驗證結果。
- CI 會增加瀏覽器安裝與 E2E 執行時間，但能在合併前攔截 UI、MOV 與 RWD 回歸。
- required check 的名稱必須維持穩定；若 workflow/job 改名，需同步更新 GitHub branch protection／ruleset。
- MOV 的 required E2E 保證 H.264/AAC metadata 讀取、移除音訊後的 MP4 流程、AAC encoder 不可用或實際失敗時保留來源 AAC packet，以及 AV1 實際編碼失敗時退回 H.264；64 kbps AAC 重新編碼仍屬目標瀏覽器／裝置的相容性驗收，不作為單一 CI runner 的跨環境保證。
