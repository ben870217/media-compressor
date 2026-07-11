import React, { useState, useEffect } from 'react';

export default function CompatibilityBanner() {
  // 預設為相容 (true)，偵測不通過時才改為 false
  const [isCompatible, setIsCompatible] = useState(true);
  const [missingFeatures, setMissingFeatures] = useState([]);

  useEffect(() => {
    // 進行核心特徵偵測 (Feature Detection)
    const hasWebCodecs = 'VideoEncoder' in window;
    const hasOffscreenCanvas = 'OffscreenCanvas' in window;

    const missing = [];
    if (!hasWebCodecs) missing.push('WebCodecs (影片硬體加速)');
    if (!hasOffscreenCanvas) missing.push('OffscreenCanvas (照片背景轉碼)');

    if (missing.length > 0) {
      setIsCompatible(false);
      setMissingFeatures(missing);
    }
  }, []);

  // 如果瀏覽器完全相容，元件不渲染任何東西 (優雅墜毀原則)
  if (isCompatible) return null;

  return (
    <div className="apple-compat-banner">
      <style>{`
        .apple-compat-banner {
          background: linear-gradient(135deg, #f59e0b, #ea580c);
          color: #ffffff;
          padding: 12px 24px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          position: sticky;
          top: 0;
          z-index: 250;
          font-family: var(--apple-font-text, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
        }

        .apple-compat-container {
          max-width: 980px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .apple-compat-content {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          text-align: left;
        }

        .apple-compat-icon {
          font-size: 24px;
          line-height: 1;
          user-select: none;
        }

        .apple-compat-title {
          font-weight: 600;
          font-size: 15px;
          margin: 0;
          line-height: 1.3;
        }

        .apple-compat-desc {
          color: #fef3c7;
          font-size: 12px;
          margin: 4px 0 0 0;
          line-height: 1.4;
        }

        .apple-compat-feature-list {
          text-decoration: underline wavy;
          font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
          font-weight: 600;
        }

        .apple-compat-badge {
          display: inline-block;
          font-size: 12px;
          background-color: rgba(0, 0, 0, 0.2);
          color: #fef3c7;
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          white-space: nowrap;
        }

        @media (max-width: 735px) {
          .apple-compat-banner {
            padding: 12px 16px;
          }
          .apple-compat-container {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          .apple-compat-content {
            align-items: flex-start;
          }
          .apple-compat-badge {
            white-space: normal;
            text-align: center;
            display: block;
          }
        }
      `}</style>

      <div className="apple-compat-container">
        <div className="apple-compat-content">
          <span className="apple-compat-icon">⚠️</span>
          <div>
            <p className="apple-compat-title">裝置效能與相容性提示</p>
            <p className="apple-compat-desc">
              您的瀏覽器目前不支援：<span className="apple-compat-feature-list">{missingFeatures.join('、')}</span>。
            </p>
          </div>
        </div>

        <div className="apple-compat-badge">
          💡 建議更換為最新版 <strong>Chrome</strong>、<strong>Edge</strong> 或 <strong>Safari</strong> 瀏覽器。
        </div>
      </div>
    </div>
  );
}
