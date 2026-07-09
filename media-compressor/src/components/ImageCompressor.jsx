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

  const workerRef = useRef(null);

  // 1. 初始化與銷毀 Web Worker (確保生命週期安全)
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/imageProcessor.js', import.meta.url),
      { type: 'module' }
    );

    // 監聽來自 Worker 的計算結果
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
      // 組件拆卸時立刻關閉執行緒，絕不殘留記憶體
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

    // 在主執行緒快取讀取寬高以觸發 4K 警告
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      setImageInfo({
        width: img.width,
        height: img.height,
        originalSizeMB: file.size / (1024 * 1024)
      });

      // 4K 定義：寬或高大於 3840，或總像素大於 800 萬
      if (img.width > 3840 || img.height > 2160 || (img.width * img.height) > 8000000) {
        setIs4KWarning(true);
      }
      URL.revokeObjectURL(img.src); // 讀完立刻釋放暫時 URL
      setStatus('idle');
    };
  };

  // 3. 智慧防抖（Debounce）核心：當目標大小或格式改變時，延遲 300ms 才送進 Worker
  useEffect(() => {
    if (!imageFile) return;

    setStatus('calculating');

    const debounceTimer = setTimeout(() => {
      // 發送訊息給背景 Worker 開始二分法虛擬預壓
      workerRef.current.postMessage({
        type: 'START_PRE_COMPRESSION',
        file: imageFile,
        targetSizeMB: targetSize,
        format: format
      });
    }, 300); // 300 毫秒防抖

    // 清理機制：如果使用者在 300ms 內又拉了滑桿，前一次的計時器會被取消，重新計時
    return () => clearTimeout(debounceTimer);
  }, [targetSize, format, imageFile]);

  // 4. 下載完成後的記憶體釋放回呼
  const handleDownloadComplete = () => {
    // 配合規格書安全防禦：下載完畢後清空產出的 Blob 狀態
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

  // 算出動態建議檔名
  const suggestedFilename = imageFile
    ? `${imageFile.name.substring(0, imageFile.name.lastIndexOf('.'))}_compressed`
    : '';
  const currentExt = format === 'image/jpeg' ? '.jpg' : '.webp';

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-xl font-bold">📸 照片壓縮工具 (OffscreenCanvas 加速)</h2>

      {/* 檔案選取 */}
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="block w-full text-sm text-gray-500" />

      {/* 4K 溫馨警告橫幅 */}
      {is4KWarning && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded text-xs text-amber-700">
          ⚠️ 提示：偵測到此照片為 4K 或超大尺寸 ({imageInfo.width}x{imageInfo.height})。背景運算編碼時間可能會拉長，請拉動滑桿後稍候片刻。
        </div>
      )}

      {imageFile && (
        <div className="space-y-4 border-t pt-4">
          {/* 格式選擇 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">輸出格式：</label>
            <select value={format} onChange={(e) => setFormat(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm">
              <option value="image/jpeg">JPEG (相容性最高)</option>
              <option value="image/webp">WebP (壓縮率極佳)</option>
            </select>
          </div>

          {/* 目標大小滑桿調整 */}
          <div>
            <div className="flex justify-between text-sm font-medium text-gray-700">
              <label>預期最大檔案大小：</label>
              <span className="text-blue-600 font-bold">{targetSize} MB</span>
            </div>
            <input
              type="range"
              min="0.1"
              max={Math.max(2, Math.ceil(imageInfo.originalSizeMB)).toString()}
              step="0.1"
              value={targetSize}
              onChange={(e) => setTargetSize(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0.1 MB</span>
              <span>原始大小: {imageInfo.originalSizeMB.toFixed(2)} MB</span>
            </div>
          </div>

          {/* 狀態即時看板 */}
          <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
            <p>📐 原始尺寸：<span className="font-semibold">{imageInfo.width} x {imageInfo.height} 像素</span></p>
            <p>⏳ 當前狀態：
              <span className={`font-semibold ${status === 'calculating' ? 'text-blue-500 animate-pulse' : 'text-gray-700'}`}>
                {status === 'calculating' && '🔄 背景二分法預壓中...'}
                {status === 'success' && '✅ 計算完畢'}
                {status === 'idle' && '待命'}
                {status === 'error' && '❌ 壓縮失敗'}
              </span>
            </p>
            {status === 'success' && (
              <p>📊 預計產出大小：<span className="text-green-600 font-bold">{realOutputSizeMB.toFixed(2)} MB</span></p>
            )}
          </div>

          {/* 整合分離式下載元件 */}
          {status === 'success' && compressedBlob && (
            <SeparatedDownload
              blob={compressedBlob}
              defaultName={suggestedFilename}
              extension={currentExt}
              onDownloadComplete={handleDownloadComplete}
            />
          )}

          {/* 手動清除重置按鈕 */}
          <button onClick={handleClear} className="w-full bg-gray-100 text-gray-700 py-2 rounded text-sm font-medium hover:bg-gray-200 transition">
            清除並重置
          </button>
        </div>
      )}
    </div>
  );
}
