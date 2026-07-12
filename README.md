# MediaCompressor

[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-0066cc?style=for-the-badge&logo=github)](https://ben870217.github.io/media-compressor/)

MediaCompressor 是一套以 React、WebCodecs 與 Mediabunny 打造的純前端媒體壓縮工具。影片與圖片都在瀏覽器本機完成處理，不需要上傳到伺服器。

**[開啟線上版本](https://ben870217.github.io/media-compressor/)**

## 主要功能

### 影片壓縮

- 支援匯入 MP4、MOV、MKV，輸出統一為 MP4。
- 可設定目標容量，並提供 10 MB 快速選項。
- 可選擇 1080p、720p、480p；若碼率不足，會自動降解析度。
- 支援 H.264、H.265、VP9、AV1 編碼。
- 可保留原始影格率，或限制為 60、30、24、15 fps。
- 支援自動／自訂視訊碼率，以及移除音訊。
- 顯示轉碼進度、實際輸出大小與壓縮前後預覽；若超過目標容量，可降低碼率重試或直接下載。

### 圖片壓縮

- 支援匯入 JPEG、PNG、WebP，輸出為 JPEG 或 WebP。
- 使用 Web Worker 與 OffscreenCanvas 在背景處理，避免阻塞主介面。
- 透過二分搜尋調整品質，盡量貼近指定目標容量。
- 讀取 EXIF 方向並自動校正。
- 偵測 4K 或超大尺寸圖片時會顯示效能提醒。
- 提供壓縮前後預覽與自訂下載檔名。

### 介面與歷程

- 提供自動、深色、淺色三種主題模式。
- 最近 50 筆成功壓縮紀錄保存在瀏覽器 `localStorage`。
- 自動管理預覽用的 Blob URL，降低長時間操作的記憶體占用。
- 響應式介面，支援桌面與行動裝置。

## 瀏覽器需求

建議使用最新版 Chrome、Edge 或 Safari。影片轉碼需要 WebCodecs，圖片背景處理需要 OffscreenCanvas 與 Web Worker。

實際可用的輸入格式、輸出 codec、轉碼速度與硬體加速能力，取決於瀏覽器、作業系統與裝置硬體。介面顯示某個 codec 選項，不代表目前裝置一定能完成該格式的編碼；若缺少核心 API，頁面會顯示相容性提示。

> 單一檔案上限為 2 GB。瀏覽器轉碼會占用較多 CPU、GPU 與記憶體，處理大型或高解析度檔案前請先確認裝置資源。

## 技術堆疊

- React 19、Vite 8、Mediabunny 1.50
- WebCodecs、Web Worker、OffscreenCanvas
- PWA（vite-plugin-pwa）與 Tailwind CSS v4
- Tauri 2（Windows 桌面交付）
- ESLint 10、React Compiler、Docker Compose（Node 26 Alpine 開發環境）

## 開始開發

應用程式位於 `media-compressor/` 子目錄。建議使用專案附帶的 Docker Compose 環境，避免 Node.js 版本差異。

### 使用 Docker（建議）

需求：Docker 與 Docker Compose。

```bash
# 在專案根目錄啟動開發容器
docker compose up -d

# 安裝依賴
docker exec -w /app/media-compressor media-compressor-dev npm install

# 啟動 Vite 開發伺服器
docker exec -w /app/media-compressor media-compressor-dev npm run dev
```

開啟 <http://localhost:5173/media-compressor/>。Vite 已設定監聽 `0.0.0.0:5173`、固定連接埠與 polling，支援 Docker volume 下的熱更新。

停止環境：

```bash
docker compose down
```

### 使用本機 Node.js

請使用支援 Vite 8 的 Node.js 版本，並以 lockfile 安裝依賴：

```bash
cd media-compressor
npm ci
npm run dev
```

## 可用指令

以下指令皆在 `media-compressor/` 目錄執行：

| 指令 | 用途 |
| --- | --- |
| `npm run dev` | 啟動 Vite 開發伺服器 |
| `npm run build` | 建立正式環境檔案至 `dist/` |
| `npm run preview` | 在本機預覽正式建置 |
| `npm run lint` | 執行 ESLint 靜態檢查 |

使用 Docker 時，請在指令前加上：

```bash
docker exec -w /app/media-compressor media-compressor-dev
```

例如：

```bash
docker exec -w /app/media-compressor media-compressor-dev npm run build
```

## 專案結構

```text
.
├── docker-compose.yml
├── README.md
└── media-compressor/
    ├── public/                 # 靜態資源
    ├── src/
    │   ├── components/         # 壓縮器、歷程與相容性元件
    │   ├── utils/              # 碼率計算與檔名處理
    │   ├── workers/            # 圖片壓縮 Web Worker
    │   ├── App.jsx
    │   └── main.jsx
    ├── eslint.config.js
    ├── package.json
    └── vite.config.js
```

## 建置與部署

```bash
cd media-compressor
npm run build
```

一般建置輸出至 `media-compressor/dist/`，預設可部署到 GitHub Pages 的 `/media-compressor/` 路徑。推送 `main` 的工作流程會發布這個「預覽版」。

正式版建置必須注入版本與專屬路徑，例如：

```bash
cd media-compressor
VITE_RELEASE_VERSION=0.2.0 \\
VITE_BASE_PATH=/media-compressor/releases/v0.2.0/ \\
npm run build
```

正式 PWA 的目標路徑是 `/media-compressor/releases/vX.Y.Z/`。每個版本應保留自己的 manifest、service worker 與快取範圍，因此新版不會覆蓋已安裝的舊版；使用者可在「版本與下載」中選擇版本，開啟目標頁後再按「安裝應用程式」。PWA ZIP 僅供部署到內網或自有 HTTPS 主機，不能以 `file://` 或直接解壓縮的方式安裝。

> 目前 `main` 的 Pages workflow 只部署預覽版。版本化 Pages 路徑的保留式部署與 Windows VM 驗收仍是待完成的發布工作；請勿將尚未驗證的產物視為已支援的離線版本。

## Windows 桌面版與離線使用

正式 GitHub Release 的目標資產為 Windows 10／11 x64：

| 檔案 | 用途 |
| --- | --- |
| `MediaCompressor-vX.Y.Z-Setup-x64.exe` | Tauri NSIS 安裝版。 |
| `MediaCompressor-vX.Y.Z-Portable-x64.exe` | Tauri 免安裝版；執行時解壓到使用者暫存目錄，結束後清除。 |
| 各 `.exe.sha256` | 對應 EXE 的 SHA-256 checksum。 |
| `MediaCompressor-vX.Y.Z-PWA.zip` | 版本化 PWA 靜態檔，供 HTTPS 網站部署。 |

Setup 與 Portable 使用同一份 React 前端、Tauri 程式和固定版 WebView2 runtime；不需要 Chrome、Node.js、Go 啟動器或本機 localhost 服務。兩者只保留瀏覽器等級的檔案選擇與下載行為，不要求原生檔案系統或 shell 權限。

第一版 EXE 不含 Authenticode 簽章，Windows 可能顯示 SmartScreen 警告。請只從官方 GitHub Release 下載，並比對同一 Release 內的 SHA-256 檔案。PowerShell 範例：

```powershell
(Get-FileHash .\MediaCompressor-v0.2.0-Setup-x64.exe -Algorithm SHA256).Hash.ToLower()
Get-Content .\MediaCompressor-v0.2.0-Setup-x64.exe.sha256
```

兩行顯示的雜湊值必須相同。固定版 WebView2 runtime 的 URL 由 repository variable `WEBVIEW2_FIXED_RUNTIME_URL` 指定；更換 runtime 時必須記錄變更並重新驗證媒體相容性。

## 版本與發布

版本採用 [Semantic Versioning](https://semver.org/lang/zh-TW/)。`media-compressor/package.json` 是前端與 Git tag 的版本來源，`media-compressor/src-tauri/Cargo.toml` 必須保持相同版本。Git tag 必須與版本完全一致並加上 `v` 前綴，例如 `0.2.0` 對應 `v0.2.0`。

變更紀錄寫在根目錄 [`CHANGELOG.md`](CHANGELOG.md)，格式與分類規則見 [`docs/CHANGELOG_FORMAT.md`](docs/CHANGELOG_FORMAT.md)。發布新版本時：

1. 決定下一個 SemVer 版本並更新 `media-compressor/package.json`、`package-lock.json` 與 `src-tauri/Cargo.toml`。
2. 將 `CHANGELOG.md` 的 `Unreleased` 項目移至新的 `## [X.Y.Z] - YYYY-MM-DD` 段落。
3. 提交版本與 CHANGELOG 變更並推送至 `main`。
4. 在相同 commit 建立並推送正式 tag：`git tag vX.Y.Z`、`git push origin vX.Y.Z`。

tag workflow 只接受正式 `vX.Y.Z`，並依序執行 `npm ci`、lint、版本比對與 CHANGELOG 擷取；通過後建置版本化 PWA ZIP、Windows Setup／Portable EXE 與各自的 SHA-256 checksum，並建立不可覆寫的 GitHub Release。預發布 tag（例如 `v0.2.0-beta.1`）不受支援。

發布前請確認 repository variable `WEBVIEW2_FIXED_RUNTIME_URL` 指向可追溯的 Microsoft 固定版 runtime CAB，並在 Windows 10／11 x64 的離線環境驗證安裝版、可攜版及 JPEG、PNG、WebP、H.264/AAC MP4 壓縮。完整待驗收項目見 [`docs/PENDING_IMPLEMENTATION_SPEC.md`](docs/PENDING_IMPLEMENTATION_SPEC.md)。

## 隱私與資料保存

- 媒體內容只在目前瀏覽器分頁中解碼與編碼，應用程式本身沒有上傳媒體的後端服務。
- 壓縮歷程只記錄檔名、大小、時間與輸出設定等摘要，不保存媒體檔案。
- 歷程資料存放於目前瀏覽器的 `localStorage`，清除網站資料或在介面中清除歷程即可移除。

## 注意事項

- 目標容量是估算值。MP4 封裝開銷、codec 行為與來源內容複雜度都可能讓實際輸出略高於設定。
- 圖片輸出會重新編碼，不保證保留原檔的完整 metadata。
- 影片 codec 相容性應以使用裝置的實際測試為準；跨平台分享時，H.264 通常是較穩妥的選擇。
