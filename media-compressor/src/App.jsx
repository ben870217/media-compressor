import React, { useState } from 'react';
import CompatibilityBanner from './components/CompatibilityBanner';
import VideoCompressor from './components/VideoCompressor';
import ImageCompressor from './components/ImageCompressor';

export default function App() {
  const [activeTab, setActiveTab] = useState('video');

  return (
    <div className="meta-container">
      {/* 核心自訂 CSS 樣式表 */}
      <style>{`
        /* 全局與變數設定 */
        :root {
          --meta-blue: #0866FF;
          --meta-blue-hover: #1877F2;
          --meta-bg: #F0F2F5;
          --meta-card-bg: #FFFFFF;
          --meta-text-primary: #050505;
          --meta-text-secondary: #65676B;
          --meta-border: #E4E6EB;
          --meta-tab-bg: #E4E6EB;
          --meta-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        .meta-container {
          font-family: var(--meta-font);
          background-color: var(--meta-bg);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          font-size: 16px;
          line-height: 1.5;
        }

        /* 頂端導覽列 */
        .meta-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background-color: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
          border-bottom: 1px solid var(--meta-border);
          padding: 0 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 64px;
          box-sizing: border-box;
        }

        @media (max-width: 640px) {
          .meta-header {
            flex-direction: column;
            height: auto;
            padding: 16px;
            gap: 16px;
          }
        }

        /* Logo 區域 */
        .meta-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          user-select: none;
        }

        .meta-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: var(--meta-blue);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(8, 102, 255, 0.25);
          transition: transform 0.2s;
        }

        .meta-brand:hover .meta-icon {
          transform: rotate(15deg);
        }

        .meta-icon-symbol {
          color: #FFFFFF;
          font-weight: 900;
          font-size: 20px;
        }

        .meta-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--meta-text-primary);
          letter-spacing: -0.5px;
          margin: 0;
        }

        /* 導覽頁籤 */
        .meta-tabs-wrapper {
          background-color: var(--meta-tab-bg);
          padding: 4px;
          border-radius: 12px;
          display: flex;
          gap: 4px;
        }

        @media (max-width: 640px) {
          .meta-tabs-wrapper {
            width: 100%;
          }
        }

        .meta-tab-btn {
          background: none;
          border: none;
          padding: 10px 24px;
          font-size: 16px;
          font-weight: 600;
          color: var(--meta-text-secondary);
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          user-select: none;
          outline: none;
        }

        @media (max-width: 640px) {
          .meta-tab-btn {
            flex: 1;
          }
        }

        .meta-tab-btn:hover {
          background-color: rgba(0, 0, 0, 0.04);
          color: var(--meta-text-primary);
        }

        .meta-tab-btn.active {
          background-color: var(--meta-card-bg);
          color: var(--meta-blue);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .meta-tab-btn:active {
          transform: scale(0.96);
        }

        /* 主內容區域 */
        .meta-main {
          flex: 1;
          padding: 48px 20px;
          max-width: 880px;
          width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .meta-main h2,
        .meta-main .compressor-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--meta-text-primary);
          margin-bottom: 12px;
        }

        .meta-main p,
        .meta-main .compressor-desc {
          font-size: 18px;
          color: var(--meta-text-secondary);
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          margin-bottom: 32px;
        }

        /* 萬用輸入框優化（防止過小） */
        .meta-main input:not([type="file"]):not([type="checkbox"]):not([type="radio"]),
        .meta-main select,
        .meta-main textarea {
          width: 100%;
          max-width: 460px;
          min-height: 44px;
          padding: 10px 16px;
          font-size: 16px;
          border: 1px solid var(--meta-border);
          border-radius: 8px;
          background-color: #FFFFFF;
          color: var(--meta-text-primary);
          box-sizing: border-box;
          transition: border-color 0.2s, box-shadow 0.2s;
          margin: 8px 0;
        }

        .meta-main input:focus {
          border-color: var(--meta-blue);
          box-shadow: 0 0 0 3px rgba(8, 102, 255, 0.15);
          outline: none;
        }

        /* 解決 input 跟按鈕黏在一起 */
        .meta-main input + button,
        .meta-main button + input {
          margin-left: 14px !important;
        }

        @media (max-width: 480px) {
          .meta-main input + button,
          .meta-main button + input {
            margin-left: 0 !important;
            margin-top: 12px !important;
          }
        }

        /* -----------------------------------------------------------
           🚨 【本次史詩級修復】強效擊碎按鈕重疊、強制區分主次按鈕視覺
        -------------------------------------------------------------- */

        /* 🛠️ 1. 基礎按鈕重置：強制加入安全邊距與物理防禦，絕不允許邊框咬死 */
        .meta-main button,
        .meta-main .meta-btn {
          box-sizing: border-box !important;
          white-space: nowrap;
          font-family: var(--meta-font);
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 15px;
          font-weight: 600;
          padding: 12px 24px;
          min-height: 44px;
          border-radius: 8px;
          border: 1px solid transparent;
          cursor: pointer;
          user-select: none;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;

          /* 防禦型外距：就算沒有 Flex 包裹，相鄰按鈕也絕不重疊 */
          margin: 6px !important;
          position: relative !important;
          float: none !important;
        }

        /* 🛠️ 2. 容器重組：自動將重疊的垂直佈局，修正為現代具有呼吸感的彈性盒（Flexbox） */
        /* 只要偵測到 div 內含有多個按鈕，強制啟動現代並排折行機制 */
        .meta-main div:has(> button + button),
        .meta-main div:has(> .meta-btn + .meta-btn),
        .meta-main .btn-group,
        .meta-main .action-container {
          display: flex !important;
          flex-direction: row !important; /* 強制改為流暢的橫向並排 */
          flex-wrap: wrap !important;     /* 寬度不夠時（如手機端）自動優雅換行 */
          justify-content: center !important;
          align-items: center !important;
          gap: 16px !important;           /* 完美的 16px 呼吸間距，徹底解決黏貼 */
          margin: 24px auto !important;
          width: 100% !important;
          height: auto !important;        /* 破除子組件可能寫死的限制高度 */
        }

        /* 🛠️ 3. 視覺主次關係自動校正（解決截圖中「兩個都是藍色按鈕」的問題） */
        /* 預設第一個按鈕為主按鈕（Primary：儲存檔案） */
        .meta-main button:not(.secondary):not(.meta-tab-btn),
        .meta-main .btn-primary {
          background-color: var(--meta-blue) !important;
          color: #FFFFFF !important;
          box-shadow: 0 2px 6px rgba(8, 102, 255, 0.15) !important;
        }
        .meta-main button:not(.secondary):not(.meta-tab-btn):hover,
        .meta-main .btn-primary:hover {
          background-color: var(--meta-blue-hover) !important;
          box-shadow: 0 4px 12px rgba(8, 102, 255, 0.3) !important;
        }

        /* 核心關鍵：自動抓取區塊中的第二個動作（清除並重置），將其強制降級為次要按鈕視覺（Secondary） */
        .meta-main div:has(> button) button:nth-child(2),
        .meta-main div:has(> button) button:last-child:not(:first-child),
        .meta-main button.secondary,
        .meta-main .btn-secondary {
          background-color: var(--meta-tab-bg) !important;
          color: var(--meta-text-primary) !important;
          box-shadow: none !important;
          border: 1px solid transparent !important;
        }
        .meta-main div:has(> button) button:nth-child(2):hover,
        .meta-main div:has(> button) button:last-child:not(:first-child):hover,
        .meta-main button.secondary:hover,
        .meta-main .btn-secondary:hover {
          background-color: #D8DADF !important; /* Meta 經典灰深色微互動 */
          color: var(--meta-text-primary) !important;
        }

        /* 點擊微互動 */
        .meta-main button:active:not(.meta-tab-btn),
        .meta-main .meta-btn:active {
          transform: scale(0.96) !important;
        }

        /* 手機端 RWD 適配 */
        @media (max-width: 480px) {
          .meta-main div:has(> button + button) {
            flex-direction: column !important; /* 手機端改為垂直大按鈕排列，更好點擊 */
            align-items: stretch !important;
            gap: 12px !important;
          }
          .meta-main button, .meta-main .meta-btn {
            margin: 0 !important;
            width: 100% !important;
          }
        }

        /* 萬用檔案選擇器置中 */
        .meta-main input[type="file"] {
          font-size: 16px;
          padding: 12px;
          margin: 0 auto;
          display: block;
        }

        .meta-main .dropzone,
        .meta-main .upload-box,
        .meta-main .file-uploader {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px auto;
          width: 100%;
          max-width: 500px;
          padding: 40px 24px;
          font-size: 18px;
        }

        /* 頁尾區域 */
        .meta-footer {
          background-color: var(--meta-card-bg);
          border-top: 1px solid var(--meta-border);
          padding: 20px 24px;
          text-align: center;
          font-size: 14px;
          color: var(--meta-text-secondary);
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 24px;
          user-select: none;
        }

        @media (max-width: 480px) {
          .meta-footer {
            flex-direction: column;
            gap: 10px;
            padding: 24px 16px;
          }
        }

        .meta-status-indicator {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .meta-dot {
          width: 8px;
          height: 8px;
          background-color: #31A24C;
          border-radius: 50%;
          box-shadow: 0 0 0 2px rgba(49, 162, 76, 0.2);
        }

        .meta-footer-text {
          margin: 0;
          letter-spacing: 0.2px;
        }
      `}</style>

      {/* 🛡️ 1. 相容性守門員 */}
      <CompatibilityBanner />

      {/* Meta 經典導覽列 */}
      <header className="meta-header">
        <div className="meta-brand">
          <div className="meta-icon">
            <span className="meta-icon-symbol">⚡</span>
          </div>
          <h1 className="meta-title">MetaBunny</h1>
        </div>

        {/* Meta 膠囊切換控制 */}
        <div className="meta-tabs-wrapper">
          <button
            onClick={() => setActiveTab('video')}
            className={`meta-tab-btn ${activeTab === 'video' ? 'active' : ''}`}
          >
            <span>🎥</span> 影片壓縮
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`meta-tab-btn ${activeTab === 'image' ? 'active' : ''}`}
          >
            <span>📸</span> 照片壓縮
          </button>
        </div>
      </header>

      {/* 主工作區 */}
      <main className="meta-main">
        {activeTab === 'video' ? <VideoCompressor /> : <ImageCompressor />}
      </main>

      {/* Meta 規格資訊頁尾 */}
      <footer className="meta-footer">
        <div className="meta-status-indicator">
          <span className="meta-dot"></span>
          <strong>純前端硬體加速</strong>
        </div>
        <p className="meta-footer-text">
          本地編碼技術 • 隱私安全（資料不落地）
        </p>
      </footer>
    </div>
  );
}
