# MediaCompressor

[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-0066cc?style=for-the-badge&logo=github)](https://ben870217.github.io/media-compressor/)

MediaCompressor 是一套以 React、WebCodecs 與 Mediabunny 打造的純前端媒體壓縮工具。影片與圖片都在瀏覽器本機處理，不需要上傳到伺服器。

**[開啟線上版本](https://ben870217.github.io/media-compressor/)**

## 功能

### 影片壓縮

- 支援匯入 MP4、MOV 與 MKV，統一輸出為 MP4。
- 可設定目標容量，並提供 JIRA 10 MB 快速選項。
- 可選擇 1080p、720p 或 480p；碼率不足時會自動降低解析度。
- 支援 H.264、H.265、VP9 與 AV1 編碼選項。
- 可保留原始影格率，或限制為 60、30、24、15 fps。
- 支援自動／自訂視訊碼率及移除音訊。
- 顯示轉碼進度、實際輸出大小及壓縮前後預覽；超過目標容量時可降低碼率重試或直接下載。

### 圖片壓縮

- 支援匯入 JPEG、PNG 與 WebP，輸出為 JPEG 或 WebP。
- 使用 Web Worker 與 OffscreenCanvas 在背景處理，避免阻塞主要介面。
- 透過二分搜尋調整品質，盡量貼近指定的目標容量。
- 讀取 EXIF 方向並自動校正；超過 4K／約 800 萬像素時顯示效能提醒。
- 提供壓縮前後預覽與自訂下載檔名。

### 其他

- 自動、深色與淺色三種主題模式。
- 最近 50 筆成功壓縮紀錄保存在瀏覽器 `localStorage`，可隨時清除。
- 自動管理預覽用的 Blob URL，降低長時間操作造成的記憶體占用。
- 響應式介面，支援桌面與行動裝置。

## 瀏覽器需求

建議使用最新版 Chrome、Edge 或 Safari。影片轉碼需要 WebCodecs，圖片背景處理需要 OffscreenCanvas 與 Web Worker。

實際可用的輸入格式、輸出 codec、轉碼速度及硬體加速能力，取決於瀏覽器、作業系統和裝置硬體。介面顯示某個 codec 選項不代表目前裝置一定能完成該格式的編碼；若缺少核心 API，頁面會顯示相容性提示。

> 單一檔案上限為 2 GB。瀏覽器轉碼會占用較多 CPU、GPU 與記憶體，處理大型或高解析度檔案前請先確認裝置資源。

## 技術堆疊

- React 19
- Vite 8
- Mediabunny 1.50
- WebCodecs、Web Worker、OffscreenCanvas
- ESLint 10、React Compiler
- Docker Compose（Node 26 Alpine 開發環境）

## 開始開發

應用程式位於 `media-compressor/` 子目錄。建議使用專案附帶的 Docker Compose 環境，以避免 Node.js 版本差異。

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

開啟 <http://localhost:5173/media-compressor/>。Vite 已設定監聽 `0.0.0.0:5173`、固定連接埠及 polling，支援 Docker volume 下的熱更新。

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

正式檔案會輸出至 `media-compressor/dist/`。目前 Vite 的 `base` 設為 `/media-compressor/`，可直接部署到同名路徑的 GitHub Pages；若部署到自訂網域根目錄或其他子路徑，請同步調整 `vite.config.js` 的 `base`。

## 隱私與資料保存

- 媒體內容只在目前瀏覽器分頁中解碼與編碼，應用程式本身沒有上傳媒體的後端服務。
- 壓縮歷程只記錄檔名、大小、時間與輸出設定等摘要，不保存媒體檔案。
- 歷程資料存放於目前瀏覽器的 `localStorage`，清除網站資料或在介面中清除歷程即可移除。

## 注意事項

- 目標容量是估算值。MP4 封裝開銷、codec 行為及來源內容複雜度都可能讓實際輸出略高於設定值。
- 圖片輸出會重新編碼，不保證保留原檔的完整 metadata。
- 影片 codec 相容性應以使用裝置的實際測試為準；跨平台分享時，H.264 通常是較穩妥的選擇。
