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
    <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-3 shadow-lg sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-sm font-medium">
        <div className="flex items-start md:items-center gap-3">
          <span className="text-2xl select-none">⚠️</span>
          <div>
            <p className="font-bold text-base">裝置效能與相容性提示</p>
            <p className="text-amber-100 text-xs mt-0.5">
              您的瀏覽器目前不支援：<span className="underline decoration-wavy font-mono">{missingFeatures.join('、')}</span>。
            </p>
          </div>
        </div>

        <div className="text-right w-full md:w-auto">
          <span className="inline-block text-xs bg-black/20 text-amber-50 px-3 py-1.5 rounded-md border border-white/10">
            💡 建議更換為最新版 <strong>Chrome</strong>、<strong>Edge</strong> 或 <strong>Safari</strong> 瀏覽器。
          </span>
        </div>
      </div>
    </div>
  );
}
