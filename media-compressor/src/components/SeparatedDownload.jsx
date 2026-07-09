// src/components/SeparatedDownload.jsx
import React, { useState, useEffect } from 'react';
// 🔴 引入剛寫好的安全過濾器
import { sanitizeFilename } from '../utils/sanitizeFilename';

export default function SeparatedDownload({ blob, defaultName, extension, onDownloadComplete }) {
  const [filename, setFilename] = useState('');

  useEffect(() => {
    if (defaultName) {
      // 初始化時，也先幫建議檔名做一次安全檢查
      setFilename(sanitizeFilename(defaultName));
    }
  }, [defaultName]);

  const handleFilenameChange = (e) => {
    const inputValue = e.target.value;

    // 🔴 直接調用獨立的過濾器，即時清洗輸入內容
    const sanitizedValue = sanitizeFilename(inputValue);
    setFilename(sanitizedValue);
  };

  const handleDownload = () => {
    if (!blob || !filename) return;

    // 如果使用者透過特殊手段清空了名稱，給予安全替代檔名
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
    <div className="mt-4 p-4 border border-green-200 bg-green-50 rounded-lg space-y-3">
      <label className="block text-sm font-medium text-green-800">
        💾 準備就緒！請確認儲存名稱：
      </label>

      <div className="flex items-center shadow-sm rounded-md border border-gray-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-green-500">
        <input
          type="text"
          value={filename}
          onChange={handleFilenameChange}
          placeholder="請輸入檔案名稱"
          className="flex-1 px-3 py-2 text-sm text-gray-900 focus:outline-none"
        />
        <span className="px-3 py-2 bg-gray-100 text-gray-500 text-sm font-mono border-l border-gray-200 select-none">
          {extension}
        </span>
      </div>

      <p className="text-xs text-gray-500">
        * 系統已自動過濾不合法字元 <code>/ \ : * ? " &lt; &gt; |</code>，且副檔名已被鎖定保護。
      </p>

      <button
        onClick={handleDownload}
        className="w-full bg-green-600 text-white font-semibold py-2 px-4 rounded hover:bg-green-700 transition duration-150"
      >
        儲存壓縮檔案
      </button>
    </div>
  );
}
