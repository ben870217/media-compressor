// src/components/VideoCompressor.jsx
import React, { useState, useEffect } from 'react';
import {
  Conversion,
  Input,
  Output,
  BlobSource,
  BufferTarget,
  MP4,          // Use this instead of Mp4InputFormat
  MATROSKA,     // Use this instead of MatroskaInputFormat
  WEBM,          // Use this instead of IsobmffInputFormat
  Mp4OutputFormat,
  LogLevel
} from 'mediabunny';
import { calculateBitrateAndResolution } from '../utils/bitrateCalculator';

export default function VideoCompressor({ onFileCleared }) {
  const [videoFile, setVideoFile] = useState(null);
  const [videoMeta, setVideoMeta] = useState({ duration: 0, hasAudio: false });
  const [targetSize, setTargetSize] = useState(10);
  const [stripAudio, setStripAudio] = useState(false);
  const [resolution, setResolution] = useState('1080p'); // 🛠️ 新增：畫質/解析度設定狀態
  const [status, setStatus] = useState('idle');
  const [calcResult, setCalcResult] = useState(null);
  const [outputBlob, setOutputBlob] = useState(null);
  const [realOutputSizeMB, setRealOutputSizeMB] = useState(0);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024 * 1024) {
      alert('檔案超過 2GB 硬限制，瀏覽器無法處理！');
      return;
    }

    setStatus('loading_meta');
    setVideoFile(file);
    setOutputBlob(null); // 重置上一次的壓縮檔案

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);

      // 🛠️ 檢查音訊優化：主流瀏覽器 (如 Chrome) 預設不支援 video.audioTracks
      // 這裡維持原邏輯，但確保在轉碼管線中不論偵測結果為何，只要使用者勾選「移除」，就必定強制 discard。
      const hasAudio = video.audioTracks ? video.audioTracks.length > 0 : true;
      setVideoMeta({ duration: video.duration, hasAudio });
      if (!hasAudio) setStripAudio(true);
      setStatus('idle');
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      alert('影片格式解析失敗。');
      handleClear();
    };
  };

  useEffect(() => {
    if (!videoFile || videoMeta.duration === 0) return;

    // 🛠️ 將手動調整的 resolution 傳入計算器
    const result = calculateBitrateAndResolution({
      targetSizeMB: targetSize,
      duration: videoMeta.duration,
      hasAudio: videoMeta.hasAudio,
      shouldStripAudio: stripAudio,
      userSelectedResolution: resolution
    });
    setCalcResult(result);
  }, [targetSize, stripAudio, videoFile, videoMeta, resolution]); // 🛠️ 新增 resolution 依賴項目

  // 核心轉碼管線
  const handleCompress = async (bitrateModifier = 1.0) => {
    if (!videoFile || !calcResult) return;
    setStatus('processing');
    setOutputBlob(null); // 開始新壓縮時清除舊檔

    try {
      const finalVideoBitrate = Math.round(calcResult.videoBitrate * bitrateModifier);

      const input = new Input({
        source: new BlobSource(videoFile),
        formats: [MP4, MATROSKA, WEBM]
      });

      const bufferTarget = new BufferTarget();
      const output = new Output({
        format: new Mp4OutputFormat(),
        target: bufferTarget
      });

      // Use Conversion.init() instead of new Conversion()
      const conversion = await Conversion.init({
          input: input,
          output: output,
          video: {
              codec: 'avc',
              bitrate: finalVideoBitrate,
              width: calcResult.resolution.width,
              height: calcResult.resolution.height,
              fit: 'contain'
          },
          // 🛠️ 音訊軌移除檢驗：只要使用者勾選 stripAudio，不管原影片判定有沒有聲音，一律強制 discard 確保效果
          audio: !stripAudio ? {
              codec: 'aac',
              bitrate: calcResult.audioBitrate
          } : {
              discard: true
          }
      });

      if (!conversion.isValid) {
        console.error('Conversion is invalid:', conversion.discardedTracks);
        setStatus('error');
        return;
      }

      await conversion.execute();

      const resultBlob = new Blob([bufferTarget.buffer], { type: 'video/mp4' });
      const sizeMB = resultBlob.size / (1024 * 1024);
      setRealOutputSizeMB(sizeMB);
      setOutputBlob(resultBlob);

      if (sizeMB > targetSize) {
        setStatus('overshoot');
      } else {
        setStatus('success');
      }
    } catch (err) {
      console.error("轉碼管線執行失敗，詳細原因:", err);
      setStatus('error');
    }
  };

  // 🛠️ 新增：統一的下載函式
  const handleDownload = () => {
    if (!outputBlob) return;
    const url = URL.createObjectURL(outputBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compressed_${resolution}_${videoFile.name || 'video.mp4'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // 釋放記憶體
  };

  const handleClear = () => {
    if (outputBlob) URL.revokeObjectURL(outputBlob);
    setVideoFile(null);
    setVideoMeta({ duration: 0, hasAudio: false });
    setCalcResult(null);
    setOutputBlob(null);
    setStatus('idle');
    if (onFileCleared) onFileCleared();
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-xl shadow-md space-y-4 text-left">
      <h2 className="text-xl font-bold">🎥 影片壓縮工具 (WebCodecs 加速)</h2>
      <input type="file" accept=".mp4,.mov,.mkv" onChange={handleFileChange} className="block w-full text-sm text-gray-500" />

      {videoFile && calcResult && (
        <div className="space-y-4 border-t pt-4">

          {/* 1. 目標檔案大小設定 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">選擇目標大小：</label>
            <div className="flex gap-2 mt-1">
              <button type="button" onClick={() => setTargetSize(10)} className={`px-3 py-1 rounded text-sm ${targetSize === 10 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Discord (10MB)</button>
              <button type="button" onClick={() => setTargetSize(20)} className={`px-3 py-1 rounded text-sm ${targetSize === 20 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>LINE (20MB)</button>
              <input type="number" value={targetSize} onChange={(e) => setTargetSize(Number(e.target.value))} className="w-20 px-2 py-1 border rounded text-center text-sm" min="1" />
              <span className="self-center text-sm text-gray-500">MB</span>
            </div>
          </div>

          {/* 🛠️ 2. 新增：使用者自訂調整畫質 (解析度) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">限制最高解析度：</label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md border"
            >
              <option value="1080p">1080p (藍光高畫質 - 適合大螢幕)</option>
              <option value="720p">720p (標準高畫質 - 適合行動裝置)</option>
              <option value="480p">480p (標清速傳 - 體積大幅縮小)</option>
              <option value="360p">360p (極致壓縮 - 適合純語音/長影片)</option>
            </select>
          </div>

          {/* 3. 移除音訊控制項 */}
          <div className="flex items-center">
            <input type="checkbox" id="stripAudio" checked={stripAudio} disabled={!videoMeta.hasAudio} onChange={(e) => setStripAudio(e.target.checked)} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
            <label htmlFor="stripAudio" className="ml-2 text-sm text-gray-900">
              移除音訊軌 {!videoMeta.hasAudio && <span className="text-gray-400 text-xs">（原始影片無音訊）</span>}
            </label>
          </div>

          {/* 4. 預期數據報告面版 */}
          <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
            <p className="text-gray-600">⏱️ 影片長度：<span className="font-semibold text-gray-900">{videoMeta.duration.toFixed(1)} 秒</span></p>
            <p className="text-gray-600">📐 預計解析度：
              <span className={`font-semibold ${calcResult.isDownscaled ? 'text-amber-600' : 'text-green-600'}`}>
                {calcResult.resolutionName} {calcResult.isDownscaled && '(已自動降階優化)'}
              </span>
            </p>
            <p className="text-gray-600">📊 預計畫質評級：<span className="font-semibold text-gray-900">{calcResult.qualityRating}</span></p>
          </div>

          {/* 5. 動作按鈕 */}
          <div className="flex gap-4">
            <button onClick={() => handleCompress(1.0)} disabled={status === 'processing'} className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:bg-gray-400 font-medium transition">
              {status === 'processing' ? '⚡ 轉碼中...' : '開始壓縮'}
            </button>
            <button onClick={handleClear} className="bg-red-100 text-red-700 py-2 px-4 rounded hover:bg-red-200 font-medium transition">清除重置</button>
          </div>
        </div>
      )}

      {/* 🛠️ 6. 狀態顯示與「強制下載區域」（不論大小符合與否皆可下載） */}
      {status === 'overshoot' && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded text-sm text-amber-700 space-y-3">
          <p>⚠️ 碼率暴走！產出大小 <strong>{realOutputSizeMB.toFixed(2)} MB</strong> 高於目標 {targetSize}MB。</p>
          <div className="flex gap-2">
            <button onClick={() => handleCompress(0.82)} className="bg-amber-600 text-white px-3 py-1.5 rounded text-xs hover:bg-amber-700 font-medium transition">
              🔄 降碼重試 (以 82% 碼率重壓)
            </button>
            {/* 核心修改：大小不符也允許直接下載 */}
            <button onClick={handleDownload} className="bg-gray-700 text-white px-3 py-1.5 rounded text-xs hover:bg-gray-800 font-medium transition">
              💾 照樣下載此影片
            </button>
          </div>
        </div>
      )}

      {status === 'success' && outputBlob && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded text-sm text-green-700 space-y-3">
          <p>🎉 壓縮成功！最終大小：<strong>{realOutputSizeMB.toFixed(2)} MB</strong>（符合目標）</p>
          <button onClick={handleDownload} className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 font-medium shadow-sm flex items-center gap-1 transition">
            💾 點擊下載壓縮影片
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700">
          <p>❌ 轉碼失敗，可能瀏覽器不支援該編碼或影片毀損。</p>
        </div>
      )}
    </div>
  );
}
