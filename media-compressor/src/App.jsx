import { useState, useEffect, useCallback } from 'react';
import CompatibilityBanner from './components/CompatibilityBanner';
import VideoCompressor from './components/VideoCompressor';
import ImageCompressor from './components/ImageCompressor';
import HistoryDashboard from './components/HistoryDashboard';

const HISTORY_KEY = 'media_compressor_history';

export default function App() {
  const [activeTab, setActiveTab] = useState('video');
  const [themeMode, setThemeMode] = useState('auto'); // 'auto' | 'light' | 'dark'
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
      return [];
    }
  });

  // 處理系統主題變化與手動覆蓋
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'auto') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', themeMode);
    }
  }, [themeMode]);

  // 壓縮完成回呼 — 寫入 localStorage
  const handleCompressComplete = useCallback((record) => {
    setHistory(prev => {
      const updated = [record, ...prev].slice(0, 50); // 最多保留 50 筆
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch { /* localStorage may be unavailable */ }
      return updated;
    });
  }, []);

  const handleHistoryClear = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* localStorage may be unavailable */ }
  }, []);

  const cycleTheme = () => {
    setThemeMode(m => m === 'auto' ? 'dark' : m === 'dark' ? 'light' : 'auto');
  };

  const themeIcon = themeMode === 'dark' ? '🌙' : themeMode === 'light' ? '☀️' : '🌗';
  const themeLabel = themeMode === 'auto' ? '自動' : themeMode === 'dark' ? '深色' : '淺色';

  return (
    <div className="apple-theme-container">
      {/* Apple 核心設計系統樣式表 */}
      <style>{`
        /* --- 核心設計代碼 (Design Tokens) — 淺色預設 --- */
        :root {
          --apple-primary: #0066cc;
          --apple-primary-focus: #0071e3;
          --apple-primary-on-dark: #2997ff;
          --apple-ink: #1d1d1f;
          --apple-ink-secondary: #7a7a7a;
          --apple-canvas: #ffffff;
          --apple-canvas-parchment: #f5f5f7;
          --apple-surface-pearl: #fafafc;
          --apple-surface-black: #000000;
          --apple-ink-muted-80: #333333;
          --apple-hairline: #e0e0e0;
          --apple-nav-bg: rgba(245, 245, 247, 0.8);
          --apple-report-bg: #f5f5f7;
          --apple-file-card-bg: #ffffff;
          --apple-artifact-bg: #ffffff;
          --apple-select-bg: #ffffff;
          --apple-chip-bg: #ffffff;
          --apple-chip-active-bg: #0066cc;
          --apple-chip-active-color: #ffffff;
          --apple-guide-caption-bg: #f5f5f7;
          --apple-download-panel-bg: rgba(49, 162, 76, 0.06);

          /* 字體系統 */
          --apple-font-display: "SF Pro Display", -apple-system, system-ui, sans-serif;
          --apple-font-text: "SF Pro Text", -apple-system, system-ui, sans-serif;

          color-scheme: light;
        }

        /* --- 深色模式 Design Tokens --- */
        @media (prefers-color-scheme: dark) {
          :root:not([data-theme="light"]) {
            --apple-primary: #2997ff;
            --apple-primary-focus: #40a9ff;
            --apple-ink: #f5f5f7;
            --apple-ink-secondary: #8e8e93;
            --apple-canvas: #1c1c1e;
            --apple-canvas-parchment: #2c2c2e;
            --apple-surface-pearl: #2c2c2e;
            --apple-surface-black: #000000;
            --apple-ink-muted-80: #d1d1d6;
            --apple-hairline: #3a3a3c;
            --apple-nav-bg: rgba(28, 28, 30, 0.85);
            --apple-report-bg: #2c2c2e;
            --apple-file-card-bg: #1c1c1e;
            --apple-artifact-bg: #2c2c2e;
            --apple-select-bg: #2c2c2e;
            --apple-chip-bg: #2c2c2e;
            --apple-chip-active-bg: #2997ff;
            --apple-chip-active-color: #ffffff;
            --apple-guide-caption-bg: #2c2c2e;
            --apple-download-panel-bg: rgba(49, 162, 76, 0.1);
            color-scheme: dark;
          }
        }

        /* 手動強制深色 */
        :root[data-theme="dark"] {
          --apple-primary: #2997ff;
          --apple-primary-focus: #40a9ff;
          --apple-ink: #f5f5f7;
          --apple-ink-secondary: #8e8e93;
          --apple-canvas: #1c1c1e;
          --apple-canvas-parchment: #2c2c2e;
          --apple-surface-pearl: #2c2c2e;
          --apple-surface-black: #000000;
          --apple-ink-muted-80: #d1d1d6;
          --apple-hairline: #3a3a3c;
          --apple-nav-bg: rgba(28, 28, 30, 0.85);
          --apple-report-bg: #2c2c2e;
          --apple-file-card-bg: #1c1c1e;
          --apple-artifact-bg: #2c2c2e;
          --apple-select-bg: #2c2c2e;
          --apple-chip-bg: #2c2c2e;
          --apple-chip-active-bg: #2997ff;
          --apple-chip-active-color: #ffffff;
          --apple-guide-caption-bg: #2c2c2e;
          --apple-download-panel-bg: rgba(49, 162, 76, 0.1);
          color-scheme: dark;
        }

        /* 手動強制淺色 */
        :root[data-theme="light"] {
          --apple-primary: #0066cc;
          --apple-primary-focus: #0071e3;
          --apple-ink: #1d1d1f;
          --apple-ink-secondary: #7a7a7a;
          --apple-canvas: #ffffff;
          --apple-canvas-parchment: #f5f5f7;
          --apple-surface-pearl: #fafafc;
          --apple-ink-muted-80: #333333;
          --apple-hairline: #e0e0e0;
          --apple-nav-bg: rgba(245, 245, 247, 0.8);
          --apple-report-bg: #f5f5f7;
          --apple-file-card-bg: #ffffff;
          --apple-artifact-bg: #ffffff;
          --apple-select-bg: #ffffff;
          --apple-chip-bg: #ffffff;
          --apple-chip-active-bg: #0066cc;
          --apple-chip-active-color: #ffffff;
          --apple-guide-caption-bg: #f5f5f7;
          --apple-download-panel-bg: rgba(49, 162, 76, 0.06);
          color-scheme: light;
        }

        /* 全局排版重置 */
        .apple-theme-container {
          font-family: var(--apple-font-text);
          background-color: var(--apple-canvas);
          color: var(--apple-ink);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          -webkit-font-smoothing: antialiased;
          font-size: 17px;
          line-height: 1.47;
          letter-spacing: -0.374px;
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        /* --- 頂端導覽列 (global-nav) --- */
        .apple-global-nav {
          background-color: var(--apple-surface-black);
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          color: #ffffff;
          font-size: 12px;
          letter-spacing: -0.12px;
          z-index: 200;
        }

        .apple-global-brand {
          display: flex;
          align-items: center;
          cursor: pointer;
        }

        .apple-global-brand-icon {
          font-size: 16px;
        }

        /* --- 磨砂子導覽列 (sub-nav-frosted) --- */
        .apple-sub-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          height: 52px;
          background-color: var(--apple-nav-bg);
          backdrop-filter: saturate(180%) blur(20px);
          -webkit-backdrop-filter: saturate(180%) blur(20px);
          border-bottom: 1px solid var(--apple-hairline);
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 32px;
        }

        .apple-sub-title {
          font-family: var(--apple-font-display);
          font-size: 21px;
          font-weight: 600;
          line-height: 1.19;
          letter-spacing: 0.231px;
          color: var(--apple-ink);
        }

        /* 膠囊式切換晶片 (configurator-option-chip) */
        .apple-tabs-container {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .apple-tab-chip {
          font-family: var(--apple-font-text);
          font-size: 14px;
          font-weight: 400;
          color: var(--apple-ink);
          background-color: var(--apple-canvas);
          border: 1px solid var(--apple-hairline);
          border-radius: 9999px;
          padding: 8px 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .apple-tab-chip:hover {
          background-color: var(--apple-canvas-parchment);
        }

        .apple-tab-chip.active {
          border-color: var(--apple-primary-focus);
          box-shadow: 0 0 0 1px var(--apple-primary-focus);
          background-color: var(--apple-canvas);
        }

        .apple-tab-chip:active {
          transform: scale(0.95);
        }

        /* 主題切換按鈕 */
        .apple-theme-toggle {
          font-family: var(--apple-font-text);
          font-size: 12px;
          font-weight: 400;
          color: var(--apple-ink-secondary);
          background-color: transparent;
          border: 1px solid var(--apple-hairline);
          border-radius: 9999px;
          padding: 4px 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 4px;
          height: 28px;
          white-space: nowrap;
        }

        .apple-theme-toggle:hover {
          background-color: var(--apple-canvas-parchment);
          color: var(--apple-ink);
        }

        .apple-theme-toggle:active {
          transform: scale(0.95);
        }

        /* --- 主內容展廳 (product-tile-light) --- */
        .apple-main-gallery {
          flex: 1;
          padding: 80px 24px;
          max-width: 980px;
          width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* 標題與引言排版 */
        .apple-gallery-title {
          font-family: var(--apple-font-display);
          font-size: 40px;
          font-weight: 600;
          line-height: 1.1;
          letter-spacing: 0;
          color: var(--apple-ink);
          margin: 0 0 12px 0;
        }

        .apple-gallery-desc {
          font-family: var(--apple-font-text);
          font-size: 17px;
          font-weight: 400;
          color: var(--apple-ink-muted-80);
          max-width: 600px;
          margin: 0 0 48px 0;
        }

        /* --- 元件與表單 --- */
        .apple-main-gallery input:not([type="file"]):not([type="checkbox"]):not([type="range"]),
        .apple-main-gallery select,
        .apple-main-gallery textarea {
          width: 100%;
          max-width: 460px;
          height: 50px;
          padding: 12px 20px;
          font-size: 17px;
          font-family: var(--apple-font-text);
          border: 1px solid var(--apple-hairline);
          border-radius: 9999px;
          background-color: var(--apple-canvas);
          color: var(--apple-ink);
          box-sizing: border-box;
          transition: border-color 0.2s;
          margin-bottom: 16px;
        }

        .apple-main-gallery input:focus {
          border-color: var(--apple-primary-focus);
          outline: none;
        }

        /* 按鈕群組排版 */
        .apple-btn-group {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin: 32px 0;
          width: 100%;
        }

        /* 按鈕基礎類別 (button-primary) */
        .apple-main-gallery button,
        .apple-btn-primary {
          font-family: var(--apple-font-text);
          font-size: 17px;
          font-weight: 400;
          color: #ffffff !important;
          background-color: var(--apple-primary) !important;
          border: none;
          border-radius: 9999px;
          padding: 11px 22px;
          min-height: 44px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 0.2s ease, background-color 0.2s;
          box-shadow: none !important;
        }

        .apple-main-gallery button:hover {
          background-color: var(--apple-primary-focus) !important;
        }

        /* 次要按鈕轉換類別 (button-secondary-pill) */
        .apple-main-gallery button:nth-child(2),
        .apple-main-gallery button.secondary {
          background-color: transparent !important;
          color: var(--apple-primary) !important;
          border: 1px solid var(--apple-primary) !important;
        }

        .apple-main-gallery button:active {
          transform: scale(0.95) !important;
        }

        /* 檔案預覽/上傳區域 */
        .apple-main-gallery .dropzone,
        .apple-main-gallery .upload-box,
        .apple-main-gallery .file-uploader,
        .apple-main-gallery .preview-card {
          background-color: var(--apple-surface-pearl) !important;
          border: 1px solid var(--apple-hairline) !important;
          border-radius: 18px !important;
          box-shadow: rgba(0, 0, 0, 0.22) 3px 5px 30px 0px !important;
          padding: 40px 24px;
          transition: transform 0.2s ease;
        }

        /* --- 頁尾設計 (footer) --- */
        .apple-footer {
          background-color: var(--apple-canvas-parchment);
          border-top: 1px solid var(--apple-hairline);
          padding: 64px 32px;
          font-size: 12px;
          color: var(--apple-ink-muted-80);
          text-align: left;
          transition: background-color 0.3s ease;
        }

        .apple-footer-content {
          max-width: 980px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .apple-status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
        }

        .apple-status-dot {
          width: 7px;
          height: 7px;
          background-color: #31a24c;
          border-radius: 50%;
        }

        .apple-footer-legal {
          margin: 0;
          letter-spacing: -0.12px;
        }

        /* 行動端 RWD */
        @media (max-width: 735px) {
          .apple-global-nav {
            padding: 0 16px;
          }
          .apple-sub-nav {
            padding: 0 16px;
          }
          .apple-main-gallery {
            padding: 48px 16px;
          }
          .apple-gallery-title {
            font-size: 32px;
          }
          .apple-gallery-desc {
            font-size: 15px;
            margin-bottom: 32px;
          }
          .apple-btn-group {
            flex-direction: column;
            align-items: stretch;
          }
          .apple-main-gallery button {
            width: 100%;
          }
          .apple-footer {
            padding: 48px 16px;
          }
          .apple-footer-content {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 16px;
          }
        }

        @media (max-width: 480px) {
          .apple-sub-nav {
            flex-direction: column;
            height: auto;
            padding: 12px 16px;
            gap: 12px;
            align-items: center;
          }
          .apple-sub-title {
            font-size: 19px;
          }
          .apple-tabs-container {
            width: 100%;
            justify-content: center;
            flex-wrap: wrap;
          }
          .apple-tab-chip {
            flex: 1;
            justify-content: center;
            padding: 6px 12px;
            font-size: 13px;
          }
          .apple-theme-toggle {
            font-size: 11px;
            padding: 3px 8px;
          }
        }
      `}</style>

      {/* 🛡️ 1. 相容性守門員線 */}
      <CompatibilityBanner />

      {/* 頂層全域導覽列 (global-nav) */}
      <nav className="apple-global-nav">
        <div className="apple-global-brand">
          <span className="apple-global-brand-icon"></span>
        </div>
        <div className="apple-global-menu-placeholder">Design Gallery</div>
      </nav>

      {/* 磨砂子導覽與核心切換器 (sub-nav-frosted) */}
      <header className="apple-sub-nav">
        <h1 className="apple-sub-title">Compressor</h1>

        <div className="apple-tabs-container">
          <button
            onClick={() => setActiveTab('video')}
            className={`apple-tab-chip ${activeTab === 'video' ? 'active' : ''}`}
          >
            <span>🎥</span> 影片
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`apple-tab-chip ${activeTab === 'image' ? 'active' : ''}`}
          >
            <span>📸</span> 照片
          </button>
          <button
            onClick={cycleTheme}
            className="apple-theme-toggle"
            title={`目前：${themeLabel}模式，點擊切換`}
          >
            <span>{themeIcon}</span>
            <span>{themeLabel}</span>
          </button>
        </div>
      </header>

      {/* 主工作展區 */}
      <main className="apple-main-gallery">
        <h2 className="apple-gallery-title">讓視覺，回歸純粹。</h2>
        <p className="apple-gallery-desc">
          極致的高畫質前端硬體壓縮技術。無需上傳、隱私安全，在瀏覽器內即可完成高效率轉碼。
        </p>

        {activeTab === 'video'
          ? <VideoCompressor onCompressComplete={handleCompressComplete} />
          : <ImageCompressor onCompressComplete={handleCompressComplete} />
        }
      </main>

      {/* 歷程紀錄面板 */}
      <HistoryDashboard history={history} onClear={handleHistoryClear} />

      {/* 規格資訊頁尾 */}
      <footer className="apple-footer">
        <div className="apple-footer-content">
          <div className="apple-status-indicator">
            <span className="apple-status-dot"></span>
            <span>純前端硬體加速已啟動</span>
          </div>
          <p className="apple-footer-legal">
            本地沙盒編碼技術 • 資料不落地保證 • © 2026 Studio
          </p>
        </div>
      </footer>
    </div>
  );
}
