// src/components/ImageCompressor.jsx
import React, { useState, useEffect, useRef } from 'react';
import SeparatedDownload from './SeparatedDownload';

export default function ImageCompressor() {
  const [imageFile, setImageFile] = useState(null);
  const [imageInfo, setImageInfo] = useState({ width: 0, height: 0, originalSizeMB: 0 });
  const [targetSize, setTargetSize] = useState(1); // 預設 1MB
  const [format, setFormat] = useState('image/jpeg'); // image/jpeg 或 image/webp

  const [status, setStatus] = useState('idle'); // idle, calculating, success, error
  const [is4KWarning, setIs4KWarning] = useState(false);
  const [compressedBlob, setCompressedBlob] = useState(null);
  const [realOutputSizeMB, setRealOutputSizeMB] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(''); // 壓縮後的預覽 URL
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState(''); // 新增：原始相片的預覽 URL

  const workerRef = useRef(null);

  // 1. 初始化與銷毀 Web Worker (確保生命週期安全)
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/imageProcessor.js', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e) => {
      const { status, finalSize, blob, error } = e.data;
      if (status === 'success') {
        setRealOutputSizeMB(finalSize);
        setCompressedBlob(blob);
        setStatus('success');
      } else if (status === 'error') {
        console.error('Worker 壓縮失敗:', error);
        setStatus('error');
      }
    };

    return () => {
      workerRef.current.terminate();
    };
  }, []);

  // 2. 處理檔案選取與 4K 尺寸偵測
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024 * 1024) {
      alert('檔案超過 2GB 硬限制，瀏覽器無法處理！');
      return;
    }

    setStatus('loading_meta');
    setImageFile(file);
    setIs4KWarning(false);
    setCompressedBlob(null);

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      setImageInfo({
        width: img.width,
        height: img.height,
        originalSizeMB: file.size / (1024 * 1024)
      });

      if (img.width > 3840 || img.height > 2160 || (img.width * img.height) > 8000000) {
        setIs4KWarning(true);
      }
      URL.revokeObjectURL(img.src);
      setStatus('idle');
    };
  };

  // 3. 智慧防抖（Debounce）核心
  useEffect(() => {
    if (!imageFile) return;

    setStatus('calculating');

    const debounceTimer = setTimeout(() => {
      workerRef.current.postMessage({
        type: 'START_PRE_COMPRESSION',
        file: imageFile,
        targetSizeMB: targetSize,
        format: format
      });
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [targetSize, format, imageFile]);

  // 監聽 compressedBlob 變化，自動管理壓縮後預覽 URL
  useEffect(() => {
    if (!compressedBlob) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(compressedBlob);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [compressedBlob]);

  // 新增：監聽 imageFile 變化，自動管理原始相片預覽 URL 的生命週期
  useEffect(() => {
    if (!imageFile) {
      setOriginalPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setOriginalPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  // 4. 下載完成後的記憶體釋放回呼
  const handleDownloadComplete = () => {
    setCompressedBlob(null);
    setStatus('idle');
  };

  // 5. 手動清除重置
  const handleClear = () => {
    setImageFile(null);
    setImageInfo({ width: 0, height: 0, originalSizeMB: 0 });
    setCompressedBlob(null);
    setIs4KWarning(false);
    setRealOutputSizeMB(0);
    setStatus('idle');
  };

  const suggestedFilename = imageFile
    ? `${imageFile.name.substring(0, imageFile.name.lastIndexOf('.'))}_compressed`
    : '';
  const currentExt = format === 'image/jpeg' ? '.jpg' : '.webp';

  return (
    <div className="apple-compressor-workspace">
      <style>{`
        .apple-compressor-workspace {
          width: 100%;
          max-width: 580px;
          margin: 0 auto;
          text-align: left;
        }

        .apple-compressor-title {
          font-family: "SF Pro Display", -apple-system, sans-serif;
          font-size: 24px;
          font-weight: 600;
          line-height: 1.2;
          color: #1d1d1f;
          margin-bottom: 24px;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        /* 檔案卡片外觀 */
        .apple-file-card {
          background-color: #ffffff;
          border: 1px dashed #e0e0e0;
          border-radius: 18px;
          padding: 32px 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          transition: border-color 0.2s, background-color 0.2s;
        }

        .apple-file-card:hover {
          background-color: #f5f5f7;
          border-color: #7a7a7a;
        }

        .apple-file-card input[type="file"] {
          font-family: "SF Pro Text", -apple-system, sans-serif;
          font-size: 14px;
          color: #1d1d1f;
          cursor: pointer;
        }

        /* 核心配置排版 */
        .apple-control-stack {
          margin-top: 32px;
          border-top: 1px solid #e0e0e0;
          padding-top: 24px;
        }

        .apple-field-block {
          margin-bottom: 24px;
        }

        .apple-field-label {
          display: block;
          font-family: "SF Pro Text", -apple-system, sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #1d1d1f;
          margin-bottom: 10px;
          letter-spacing: -0.224px;
        }

        /* 橫列滑桿與控制項對齊 */
        .apple-slider-row {
          display: flex;
          flex-direction: row;
          gap: 12px;
          align-items: center;
        }

        /* 阻斷全域污染：強制重置 Range Slider 軌道外觀 */
        .apple-main-gallery input.apple-range-slider {
          -webkit-appearance: none !important;
          appearance: none !important;
          flex: 1 !important;
          width: auto !important;
          height: 6px !important;
          background: #000000 !important;
          border: none !important;
          padding: 0 !important;
          margin: 0 !important;
          border-radius: 9999px !important;
          outline: none !important;
          box-shadow: none !important;
          cursor: pointer !important;
        }

        /* 阻斷全域污染：控制 Webkit 滑塊按鈕外觀 */
        .apple-range-slider::-webkit-slider-thumb {
          -webkit-appearance: none !important;
          appearance: none !important;
          width: 22px !important;
          height: 22px !important;
          border-radius: 50% !important;
          background: #ffffff !important;
          border: 0.5px solid rgba(0, 0, 0, 0.2) !important;
          box-shadow: 0px 2px 7px rgba(0, 0, 0, 0.3) !important;
          cursor: pointer !important;
          transition: transform 0.1s ease !important;
          margin-top: 0px !important;
        }

        .apple-range-slider::-webkit-slider-thumb:active {
          transform: scale(1.15) !important;
        }

        .apple-range-slider::-moz-range-thumb {
          width: 22px !important;
          height: 22px !important;
          border-radius: 50% !important;
          background: #ffffff !important;
          border: 0.5px solid rgba(0, 0, 0, 0.2) !important;
          box-shadow: 0px 2px 7px rgba(0, 0, 0, 0.3) !important;
          cursor: pointer !important;
          transition: transform 0.1s ease !important;
        }

        /* 精確限縮膠囊型指定輸入框 */
        .apple-main-gallery input.apple-input-inline-capsule {
          width: 80px !important;
          max-width: 80px !important;
          height: 30px !important;
          padding: 0 8px !important;
          font-size: 14px !important;
          border: 1px solid #e0e0e0 !important;
          border-radius: 9999px !important;
          text-align: center !important;
          background-color: #ffffff !important;
          color: #1d1d1f !important;
          box-sizing: border-box !important;
          margin: 0 !important;
          display: inline-block !important;
        }

        .apple-input-inline-capsule:focus {
          border-color: #0071e3 !important;
          outline: none !important;
          box-shadow: 0 0 0 1px #0071e3 !important;
        }

        .apple-unit-text {
          font-size: 14px;
          color: #7a7a7a;
          font-weight: 500;
        }

        /* 標準下拉選單樣式 */
        .apple-select-element {
          width: 100%;
          height: 42px;
          padding: 0 12px;
          font-size: 15px;
          font-family: "SF Pro Text", -apple-system, sans-serif;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background-color: #ffffff;
          color: #1d1d1f;
          box-sizing: border-box;
          letter-spacing: -0.224px;
        }

        .apple-select-element:focus {
          border-color: #0071e3;
          outline: none;
        }

        /* 溫馨提示與警告橫幅 */
        .apple-warning-banner {
          margin-top: 16px;
          font-family: "SF Pro Text", -apple-system, sans-serif;
          font-size: 14px;
          line-height: 1.45;
          color: #b78103;
          background-color: #fffbeb;
          border: 1px solid #fde68a;
          padding: 12px 16px;
          border-radius: 8px;
        }

        /* 數據清單儀表板 */
        .apple-report-panel {
          background-color: #f5f5f7;
          border-radius: 12px;
          padding: 16px 20px;
          font-family: "SF Pro Text", -apple-system, sans-serif;
          font-size: 14px;
          color: #1d1d1f;
        }

        .apple-report-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
        }

        .apple-report-label {
          color: #7a7a7a;
        }

        .apple-report-value {
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }

        @keyframes applePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .pulsing-blue {
          color: #0066cc;
          animation: applePulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .apple-report-value.green {
          color: #31a24c;
        }

        .apple-report-divider {
          border: 0;
          border-top: 1px solid #e0e0e0;
          margin: 10px 0;
        }

        /* 動作按鈕集群 */
        .apple-action-cluster {
          display: flex;
          gap: 12px;
          margin-top: 28px;
        }

        .apple-btn-secondary {
          font-family: "SF Pro Text", -apple-system, sans-serif;
          font-size: 16px;
          font-weight: 500;
          color: #0066cc;
          background-color: transparent;
          border: 1px solid #0066cc;
          border-radius: 9999px;
          padding: 0 24px;
          height: 44px;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .apple-btn-secondary:hover { background-color: rgba(0, 102, 204, 0.04); }
        .apple-btn-secondary:active { transform: scale(0.95); }

        /* 成果實體卡片 */
        .apple-artifact-card {
          background-color: #ffffff;
          border: 1px solid #e0e0e0;
          border-radius: 14px;
          padding: 24px;
          margin-top: 28px;
          box-shadow: rgba(0, 0, 0, 0.22) 3px 5px 30px 0px;
          font-family: "SF Pro Text", -apple-system, sans-serif;
          font-size: 14px;
        }

        .apple-artifact-status {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        /* 預覽相片外殼與樣式 */
        .apple-preview-image-wrapper {
          width: 100%;
          background-color: #000000;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 16px;
          display: flex;
          justify-content: center;
          align-items: center;
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
        }

        .apple-preview-image {
          width: 100%;
          max-height: 320px;
          object-fit: contain;
          display: block;
          background-color: #000000;
        }

        @media (max-width: 580px) {
          .apple-compressor-workspace {
            padding: 0;
          }
          .apple-slider-row {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }
          .apple-slider-row > div {
            justify-content: flex-end;
          }
          .apple-action-cluster {
            flex-direction: column;
            gap: 12px;
            margin-top: 20px;
          }
          .apple-btn-main,
          .apple-btn-secondary {
            width: 100%;
            flex: none !important;
          }
        }

        @media (max-width: 480px) {
          .apple-report-panel {
            padding: 12px 14px;
            font-size: 13px;
          }
          .apple-report-row {
            padding: 4px 0;
          }
          .apple-preview-image {
            max-height: 220px;
          }
          .apple-artifact-card {
            padding: 16px;
            margin-top: 20px;
          }
        }
      `}</style>

      <h2 className="apple-compressor-title">
        <span>📸</span> 相片硬體加速壓縮
      </h2>

      {/* 檔案選取 */}
      <div className="apple-file-card">
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
      </div>

      {/* 4K 尺寸警告橫幅 */}
      {is4KWarning && (
        <div className="apple-warning-banner">
          ⚠️ <strong>超大尺寸提示：</strong> 偵測到此照片為 4K 或超大尺寸 ({imageInfo.width} × {imageInfo.height})。背景 OffscreenCanvas 二分法預壓處理時間可能會拉長，請拉動控制項後稍候片刻。
        </div>
      )}

      {imageFile && (
        <div className="apple-control-stack">

          {/* 新增項目：原始相片縮圖預覽 */}
          {originalPreviewUrl && (
            <div className="apple-field-block">
              <label className="apple-field-label">🖼️ 原始照片預覽</label>
              <div className="apple-preview-image-wrapper">
                <img src={originalPreviewUrl} alt="Original preview" className="apple-preview-image" />
              </div>
            </div>
          )}

          {/* 1. 格式選擇 */}
          <div className="apple-field-block">
            <label className="apple-field-label">選擇輸出相片格式</label>
            <select value={format} onChange={(e) => setFormat(e.target.value)} className="apple-select-element">
              <option value="image/jpeg">JPEG (相容性最高)</option>
              <option value="image/webp">WebP (壓縮率極佳 - 適合網頁最佳化)</option>
            </select>
          </div>

          {/* 2. 目標大小滑桿調整 */}
          <div className="apple-field-block">
            <label className="apple-field-label">預期最大檔案大小</label>
            <div className="apple-slider-row">
              <input
                type="range"
                min="0.1"
                max={Math.max(2, Math.ceil(imageInfo.originalSizeMB)).toString()}
                step="0.1"
                value={targetSize}
                onChange={(e) => setTargetSize(Number(e.target.value))}
                className="apple-range-slider"
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="number"
                  value={targetSize}
                  onChange={(e) => setTargetSize(Number(e.target.value))}
                  className="apple-input-inline-capsule"
                  step="0.1"
                  min="0.1"
                />
                <span className="apple-unit-text">MB</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }} className="apple-unit-text">
              <span>極限值: 0.1 MB</span>
              <span>原始體積: {imageInfo.originalSizeMB.toFixed(2)} MB</span>
            </div>
          </div>

          {/* 3. 數據與狀態即時看板 */}
          <div className="apple-report-panel">
            <div className="apple-report-row">
              <span className="apple-report-label">📐 原始解析度</span>
              <span className="apple-report-value">{imageInfo.width} × {imageInfo.height} 像素</span>
            </div>
            <div className="apple-report-row">
              <span className="apple-report-label">⏳ 運算狀態</span>
              <span className={`apple-report-value ${status === 'calculating' ? 'pulsing-blue' : ''}`}>
                {status === 'calculating' && '🔄 背景二分法預壓中...'}
                {status === 'success' && '✅ 計算完畢'}
                {status === 'idle' && '待命'}
                {status === 'error' && '❌ 壓縮失敗'}
              </span>
            </div>
            {status === 'success' && (
              <>
                <hr className="apple-report-divider" />
                <div className="apple-report-row">
                  <span className="apple-report-label">📊 預計產出大小</span>
                  <span className="apple-report-value green">{realOutputSizeMB.toFixed(2)} MB</span>
                </div>
              </>
            )}
          </div>

          {/* 4. 整合分離式下載元件與成果工藝品卡片 */}
          {status === 'success' && compressedBlob && (
            <div className="apple-artifact-card">
              <div className="apple-artifact-status" style={{ color: '#0066cc' }}>🎉 影像優化封裝完成</div>
              <p style={{ color: '#1d1d1f', marginBottom: '16px' }}>
                已精密調校壓縮至目標範圍內（產出體積：<strong>{realOutputSizeMB.toFixed(2)} MB</strong>）。
              </p>

              {/* 預覽壓縮後的照片 */}
              {previewUrl && (
                <div className="apple-preview-image-wrapper">
                  <img src={previewUrl} alt="Compressed preview" className="apple-preview-image" />
                </div>
              )}

              <SeparatedDownload
                blob={compressedBlob}
                defaultName={suggestedFilename}
                extension={currentExt}
                onDownloadComplete={handleDownloadComplete}
              />
            </div>
          )}

          {/* 5. 手動清除重置按鈕 */}
          <div className="apple-action-cluster">
            <button onClick={handleClear} className="apple-btn-secondary" style={{ width: '100%' }}>
              清除並重置面板
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
