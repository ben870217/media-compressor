# ADR-0040：Pull Request E2E 使用 Playwright 管理的 Chromium

## 狀態

已接受

## 背景

Pull Request 品質閘門需要執行 MOV、預覽、折疊面板與 RWD 的瀏覽器驗收。開發用 Docker image 目前提供 Alpine 的 `/usr/bin/chromium`，但 GitHub Actions runner 不保證存在相同路徑或相同瀏覽器 build。

## 決策

- Playwright config 預設使用 Playwright 管理的 Chromium。
- CI 在執行 E2E 前安裝對應的 Chromium 與系統依賴。
- 本機 Docker 可透過 `PLAYWRIGHT_CHROMIUM_PATH` 指向 image 內的 system Chromium，以維持離線／固定環境的開發流程。
- CI 與本機共用 `npm run test:e2e`，不建立兩套不同的驗收腳本。

## 取捨

- Playwright 管理瀏覽器增加 CI 安裝時間與 cache 維護，但避免 workflow 綁定 `/usr/bin/chromium`。
- 本機與 CI 可能使用不同 Chromium build；因此 E2E 證明的是公開 UI 行為，codec 相容性仍須在目標裝置補驗。
