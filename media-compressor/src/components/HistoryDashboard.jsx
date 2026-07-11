// src/components/HistoryDashboard.jsx
import { useState } from 'react';

/**
 * HistoryDashboard — 本地壓縮歷程紀錄面板
 * 從 localStorage 讀取的 history 陣列由 App.jsx 管理傳入。
 * 每筆 record 格式：
 * {
 *   id: string,
 *   timestamp: number,
 *   type: 'video' | 'image',
 *   filename: string,
 *   originalSizeMB: number,
 *   compressedSizeMB: number,
 *   savedMB: number,
 *   savedPercent: number,
 *   detail: string, // 例如 '720p / H.264' 或 'JPEG / 0.85MB'
 * }
 */
export default function HistoryDashboard({ history = [], onClear }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const successfulHistory = history.filter((record) => record.status !== 'failed' && record.status !== 'cancelled');
  const totalSavedMB = successfulHistory.reduce((acc, r) => acc + (r.savedMB || 0), 0);
  const totalCount = history.length;

  return (
    <div className="apple-history-section">
      <style>{`
        .apple-history-section {
          background-color: var(--apple-canvas-parchment);
          border-top: 1px solid var(--apple-hairline);
          transition: background-color 0.3s ease;
        }

        .apple-history-header {
          max-width: 980px;
          margin: 0 auto;
          padding: 20px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          user-select: none;
          gap: 16px;
        }

        .apple-history-header:hover .apple-history-expand-icon {
          color: var(--apple-ink);
        }

        .apple-history-meta {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .apple-history-title {
          font-family: var(--apple-font-display);
          font-size: 15px;
          font-weight: 600;
          color: var(--apple-ink);
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }

        .apple-history-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background-color: var(--apple-primary);
          color: #ffffff;
          font-size: 11px;
          font-weight: 600;
          border-radius: 9999px;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
        }

        .apple-history-summary {
          font-size: 12px;
          color: var(--apple-ink-secondary);
        }

        .apple-history-summary strong {
          color: #31a24c;
          font-weight: 600;
        }

        .apple-history-expand-icon {
          font-size: 12px;
          color: var(--apple-ink-secondary);
          transition: transform 0.25s ease, color 0.2s;
          flex-shrink: 0;
        }

        .apple-history-expand-icon.expanded {
          transform: rotate(180deg);
        }

        /* 可摺疊內容區 */
        .apple-history-body {
          overflow: hidden;
          transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
          max-height: 0;
          opacity: 0;
        }

        .apple-history-body.open {
          max-height: 600px;
          opacity: 1;
          overflow-y: auto;
        }

        .apple-history-inner {
          max-width: 980px;
          margin: 0 auto;
          padding: 0 32px 24px;
        }

        /* 統計摘要列 */
        .apple-history-stats-row {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .apple-stat-chip {
          background-color: var(--apple-canvas);
          border: 1px solid var(--apple-hairline);
          border-radius: 12px;
          padding: 12px 16px;
          min-width: 120px;
          flex: 1;
        }

        .apple-stat-chip-label {
          font-size: 11px;
          color: var(--apple-ink-secondary);
          margin-bottom: 4px;
        }

        .apple-stat-chip-value {
          font-size: 20px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          color: var(--apple-ink);
        }

        .apple-stat-chip-value.green { color: #31a24c; }
        .apple-stat-chip-value.blue { color: var(--apple-primary); }

        /* 紀錄清單 */
        .apple-history-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .apple-history-item {
          background-color: var(--apple-canvas);
          border: 1px solid var(--apple-hairline);
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: transform 0.15s ease;
        }

        .apple-history-item:hover {
          transform: translateX(2px);
        }

        .apple-history-item-icon {
          font-size: 20px;
          flex-shrink: 0;
          width: 32px;
          text-align: center;
        }

        .apple-history-item-body {
          flex: 1;
          min-width: 0;
        }

        .apple-history-item-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--apple-ink);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 2px;
        }

        .apple-history-item-detail {
          font-size: 11px;
          color: var(--apple-ink-secondary);
        }

        .apple-history-item-sizes {
          text-align: right;
          flex-shrink: 0;
        }

        .apple-history-item-saved {
          font-size: 13px;
          font-weight: 700;
          color: #31a24c;
          font-variant-numeric: tabular-nums;
        }

        .apple-history-item-original {
          font-size: 11px;
          color: var(--apple-ink-secondary);
          font-variant-numeric: tabular-nums;
        }

        .apple-history-item-time {
          font-size: 11px;
          color: var(--apple-ink-secondary);
          flex-shrink: 0;
          white-space: nowrap;
        }

        /* 空狀態 */
        .apple-history-empty {
          text-align: center;
          padding: 32px 0;
          color: var(--apple-ink-secondary);
          font-size: 14px;
        }

        .apple-history-empty-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }

        /* 清除按鈕 */
        .apple-history-clear-btn {
          font-family: var(--apple-font-text);
          font-size: 12px;
          font-weight: 400;
          color: #ff3b30 !important;
          background-color: transparent !important;
          border: 1px solid rgba(255, 59, 48, 0.3) !important;
          border-radius: 9999px !important;
          padding: 4px 12px !important;
          height: 26px !important;
          min-height: unset !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-shadow: none !important;
        }

        .apple-history-clear-btn:hover {
          background-color: rgba(255, 59, 48, 0.08) !important;
          border-color: #ff3b30 !important;
        }

        @media (max-width: 735px) {
          .apple-history-header {
            padding: 16px;
          }
          .apple-history-inner {
            padding: 0 16px 20px;
          }
          .apple-stat-chip {
            min-width: 80px;
          }
          .apple-stat-chip-value {
            font-size: 17px;
          }
          .apple-history-item-time {
            display: none;
          }
        }

        @media (max-width: 480px) {
          .apple-history-meta {
            gap: 8px;
          }
          .apple-history-stats-row {
            gap: 8px;
          }
        }
      `}</style>

      {/* 標題列（可點擊展開） */}
      <div className="apple-history-header" onClick={() => setIsExpanded(v => !v)}>
        <div className="apple-history-meta">
          <h2 className="apple-history-title">
            <span>📁</span>
            壓縮歷程
            {totalCount > 0 && (
              <span className="apple-history-badge">{totalCount}</span>
            )}
          </h2>
          {totalCount > 0 && (
            <span className="apple-history-summary">
              共節省 <strong>{totalSavedMB.toFixed(1)} MB</strong>
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isExpanded && totalCount > 0 && (
            <button
              className="apple-history-clear-btn"
              onClick={(e) => { e.stopPropagation(); onClear?.(); }}
            >
              清除全部
            </button>
          )}
          <span className={`apple-history-expand-icon ${isExpanded ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>
      </div>

      {/* 可摺疊主體 */}
      <div className={`apple-history-body ${isExpanded ? 'open' : ''}`}>
        <div className="apple-history-inner">

          {totalCount === 0 ? (
            <div className="apple-history-empty">
              <div className="apple-history-empty-icon">🗂️</div>
              <div>尚無壓縮紀錄。完成第一次壓縮後將自動記錄於此。</div>
            </div>
          ) : (
            <>
              {/* 統計摘要 */}
              <div className="apple-history-stats-row">
                <div className="apple-stat-chip">
                  <div className="apple-stat-chip-label">總壓縮次數</div>
                  <div className="apple-stat-chip-value blue">{totalCount}</div>
                </div>
                <div className="apple-stat-chip">
                  <div className="apple-stat-chip-label">總節省空間</div>
                  <div className="apple-stat-chip-value green">{totalSavedMB.toFixed(1)} MB</div>
                </div>
                <div className="apple-stat-chip">
                  <div className="apple-stat-chip-label">平均壓縮率</div>
                  <div className="apple-stat-chip-value">
                    {(history.reduce((a, r) => a + (r.savedPercent || 0), 0) / totalCount).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* 歷程清單 */}
              <div className="apple-history-list">
                {history.map(record => (
                  <div key={record.id} className="apple-history-item">
                    <div className="apple-history-item-icon">
                      {record.type === 'video' ? '🎥' : '📸'}
                    </div>
                    <div className="apple-history-item-body">
                      <div className="apple-history-item-name" title={record.filename}>
                        {record.filename}
                      </div>
                      <div className="apple-history-item-detail">{record.detail}</div>
                    </div>
                    <div className="apple-history-item-sizes">
                      {record.status === 'failed' || record.status === 'cancelled' ? (
                        <div className="apple-history-item-original">{record.status === 'failed' ? '失敗' : '已取消'}</div>
                      ) : <>
                        <div className="apple-history-item-saved">
                          -{(record.savedPercent || 0).toFixed(0)}% ({(record.savedMB || 0).toFixed(1)} MB)
                        </div>
                        <div className="apple-history-item-original">
                          {(record.originalSizeMB || 0).toFixed(1)} → {(record.compressedSizeMB || 0).toFixed(2)} MB
                        </div>
                      </>}
                    </div>
                    <div className="apple-history-item-time">
                      {new Date(record.timestamp).toLocaleString('zh-TW', {
                        month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
