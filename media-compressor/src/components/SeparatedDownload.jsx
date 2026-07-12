// src/components/SeparatedDownload.jsx
import { useState } from 'react';
import { sanitizeFilename } from '../utils/sanitizeFilename';

export default function SeparatedDownload({ blob, defaultName, extension, onDownloadComplete }) {
  const [filename, setFilename] = useState(() => sanitizeFilename(defaultName || ''));

  const handleFilenameChange = (e) => {
    const inputValue = e.target.value;
    const sanitizedValue = sanitizeFilename(inputValue);
    setFilename(sanitizedValue);
  };

  const handleDownload = () => {
    if (!blob || !filename) return;

    const safeFilename = filename.trim() || 'unnamed_file';
    const fullFilename = `${safeFilename}${extension}`;

    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fullFilename;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);

    if (onDownloadComplete) {
      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
        onDownloadComplete();
      }, 100);
    }
  };

  return (
    <div className="apple-download-panel">
      <style>{`
        .apple-download-panel {
          background-color: var(--apple-download-panel-bg);
          border: 1px solid rgba(49, 162, 76, 0.2);
          border-radius: 14px;
          padding: 16px;
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-sizing: border-box;
          width: 100%;
          text-align: left;
          font-family: var(--apple-font-text, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
        }

        .apple-download-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #298d3f;
          margin: 0;
        }

        .apple-download-input-container {
          display: flex;
          align-items: stretch;
          border: 1px solid var(--apple-hairline);
          border-radius: 9999px;
          background-color: var(--apple-canvas);
          overflow: hidden;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
          box-sizing: border-box;
          width: 100%;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .apple-download-input-container:focus-within {
          border-color: #31a24c;
          box-shadow: 0 0 0 1px #31a24c;
        }

        .apple-download-input {
          flex: 1;
          border: none !important;
          background: transparent !important;
          margin: 0 !important;
          height: 38px !important;
          padding: 0 16px !important;
          font-size: 14px !important;
          border-radius: 9999px 0 0 9999px !important;
          box-sizing: border-box !important;
          color: var(--apple-ink) !important;
        }

        .apple-download-input:focus {
          outline: none !important;
        }

        .apple-download-ext {
          display: flex;
          align-items: center;
          padding: 0 16px;
          background-color: var(--apple-canvas-parchment);
          color: var(--apple-ink-secondary);
          font-size: 13px;
          font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
          border-left: 1px solid var(--apple-hairline);
          user-select: none;
        }

        .apple-download-hint {
          font-size: 11px;
          color: var(--apple-ink-secondary);
          margin: 0;
          line-height: 1.4;
        }

        .apple-download-button {
          width: 100%;
          font-family: var(--apple-font-text, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
          font-size: 15px;
          font-weight: 500;
          color: #ffffff !important;
          background-color: #31a24c !important;
          border: none !important;
          border-radius: 9999px !important;
          height: 40px !important;
          cursor: pointer !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.2s ease !important;
          box-sizing: border-box !important;
          box-shadow: none !important;
          text-decoration: none !important;
        }

        .apple-download-button:hover {
          background-color: #298d3f !important;
        }

        .apple-download-button:active {
          transform: scale(0.98) !important;
        }
      `}</style>

      <label className="apple-download-label">
        💾 準備就緒！請確認儲存名稱：
      </label>

      <div className="apple-download-input-container">
        <input
          type="text"
          value={filename}
          onChange={handleFilenameChange}
          placeholder="請輸入檔案名稱"
          className="apple-download-input"
        />
        <span className="apple-download-ext">
          {extension}
        </span>
      </div>

      <p className="apple-download-hint">
        * 系統已自動過濾不合法字元 <code>/ \ : * ? &quot; &lt; &gt; |</code>，且副檔名已被鎖定保護。
      </p>

      <button
        onClick={handleDownload}
        className="apple-download-button"
      >
        儲存壓縮檔案
      </button>
    </div>
  );
}
