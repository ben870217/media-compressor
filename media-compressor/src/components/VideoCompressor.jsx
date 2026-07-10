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
  // 🛠️ 擴充元資料：加入原始影片編碼 (codec) 與總碼率 (bitrate)
  const [videoMeta, setVideoMeta] = useState({ duration: 0, hasAudio: false, codec: '', bitrate: '' });
  const [targetSize, setTargetSize] = useState(10);
  const [stripAudio, setStripAudio] = useState(false);
  const [resolution, setResolution] = useState('720p'); // 🛠️ 優化：預設值調整為 720p，避免 1080p 壓太大或自動降過低
  const [outputCodec, setOutputCodec] = useState('avc'); // 🛠️ 新增：輸出編碼選擇狀態 (預設 avc / h.264)
  const [bitrateMode, setBitrateMode] = useState('auto'); // 🛠️ 新增：碼率模式選單狀態
  const [customBitrate, setCustomBitrate] = useState('auto'); // 🛠️ 新增：最終套用的自訂碼率 (kbps)
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

    video.onloadedmetadata = async () => {
      URL.revokeObjectURL(video.src);

      const hasAudio = video.audioTracks ? video.audioTracks.length > 0 : true;

      // 🛠️ 預估初始總平均碼率 (檔案大小 * 8 / 時長)
      let estimatedBitrate = '計算中...';
      if (video.duration > 0) {
        const totalBitrateKbps = Math.round((file.size * 8) / (video.duration * 1024));
        estimatedBitrate = `${totalBitrateKbps} kbps`;
      }

      setVideoMeta({
        duration: video.duration,
        hasAudio,
        codec: '偵測中...',
        bitrate: estimatedBitrate
      });

      if (!hasAudio) setStripAudio(true);
      setStatus('idle');

      // 🛠️ 異步使用 mediabunny 精準解析原始視訊編碼
      try {
        const inputInstance = new Input({
          source: new BlobSource(file),
          formats: [MP4, MATROSKA, WEBM]
        });
        const videoTrack = await inputInstance.getPrimaryVideoTrack();
        if (videoTrack) {
          const rawCodec = videoTrack.codec || videoTrack.codecName || 'AVC / H.264';
          setVideoMeta(prev => ({ ...prev, codec: rawCodec.toUpperCase() }));
        } else {
          setVideoMeta(prev => ({ ...prev, codec: '未知編碼' }));
        }
      } catch (err) {
        console.error("無法精準讀取原始編碼", err);
        setVideoMeta(prev => ({ ...prev, codec: 'AVC / H.264 (推測)' }));
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      alert('影片格式解析失敗。');
      handleClear();
    };
  };

  useEffect(() => {
    if (!videoFile || videoMeta.duration === 0) return;

    const result = calculateBitrateAndResolution({
      targetSizeMB: targetSize,
      duration: videoMeta.duration,
      hasAudio: videoMeta.hasAudio,
      shouldStripAudio: stripAudio,
      userSelectedResolution: resolution
    });
    setCalcResult(result);
  }, [targetSize, stripAudio, videoFile, videoMeta.duration, videoMeta.hasAudio, resolution]);

  // 核心轉碼管線
  const handleCompress = async (bitrateModifier = 1.0) => {
    if (!videoFile || !calcResult) return;
    setStatus('processing');
    setOutputBlob(null); // 開始新壓縮時清除舊檔

    try {
      // 🛠️ 判斷碼率來源：若為 auto 則走演算法推薦碼率，自訂則將 kbps 轉換為 bps 並乘上調整係數
      let finalVideoBitrate;
      if (customBitrate === 'auto') {
        finalVideoBitrate = Math.round(calcResult.videoBitrate * bitrateModifier);
      } else {
        finalVideoBitrate = Math.round(Number(customBitrate) * 1024 * bitrateModifier);
      }

      const input = new Input({
        source: new BlobSource(videoFile),
        formats: [MP4, MATROSKA, WEBM]
      });

      const bufferTarget = new BufferTarget();
      const output = new Output({
        format: new Mp4OutputFormat(),
        target: bufferTarget
      });

      const conversion = await Conversion.init({
          input: input,
          output: output,
          video: {
              codec: outputCodec, // 🛠️ 動態套用使用者選擇的輸出編碼
              bitrate: finalVideoBitrate,
              width: calcResult.resolution.width,
              height: calcResult.resolution.height,
              fit: 'contain'
          },
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

  const handleDownload = () => {
    if (!outputBlob) return;
    const url = URL.createObjectURL(outputBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compressed_${resolution}_${outputCodec}_${videoFile.name || 'video.mp4'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (outputBlob) URL.revokeObjectURL(outputBlob);
    setVideoFile(null);
    setVideoMeta({ duration: 0, hasAudio: false, codec: '', bitrate: '' });
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

          {/* 2. 畫質限制調整 */}
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
            </select>
          </div>

          {/* 🛠️ 3. 新增：輸出編碼格式選擇與行為描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">輸出影片編碼格式 (Codec)：</label>
            <select
              value={outputCodec}
              onChange={(e) => setOutputCodec(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md border"
            >
              <option value="avc">H.264 / AVC (相容性最高)</option>
              <option value="hevc">H.265 / HEVC (高壓縮率、適合 Apple 裝置)</option>
              <option value="vp9">VP9 (Google 格式、高網頁相容性)</option>
              <option value="av1">AV1 (次世代格式、體積最小)</option>
            </select>
            <p className="mt-1.5 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200 leading-relaxed">
              💡 <strong>編碼指南：</strong>
              {outputCodec === 'avc' && ' 相容性完美。幾乎所有瀏覽器、手機、電視都能直接播放，社群軟體傳輸首選。'}
              {outputCodec === 'hevc' && ' 相同畫質下比 H.264 縮小近 50% 體積。適合 iPhone/Mac 與高畫質儲存，但部分舊型 Windows 或舊瀏覽器可能無法直接預覽。'}
              {outputCodec === 'vp9' && ' 由 Google 主導的開放格式，YouTube 核心編碼。壓縮率極佳，在 Chrome/Android 支援度極好。'}
              {outputCodec === 'av1' && ' 最新免授權編碼，壓縮率最高（體積最小），但轉碼非常吃重 CPU 效能，壓縮時間會拉得較長。'}
            </p>
          </div>

          {/* 🛠️ 4. 新增：自訂調整輸出碼率 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">調整輸出影片碼率 (Bitrate)：</label>
            <div className="flex gap-2 mt-1">
              <select
                value={bitrateMode}
                onChange={(e) => {
                  const mode = e.target.value;
                  setBitrateMode(mode);
                  if (mode !== 'custom') {
                    setCustomBitrate(mode);
                  } else {
                    setCustomBitrate('2000'); // 切換到自訂時給予預設值 2000 kbps
                  }
                }}
                className="block flex-1 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md border"
              >
                <option value="auto">自動計算 (依目標檔案大小最佳化)</option>
                <option value="500">500 kbps (超低畫質 - 適合文字速傳)</option>
                <option value="1000">1000 kbps (1 Mbps - 適合 480p 行動流暢)</option>
                <option value="2000">2000 kbps (2 Mbps - 適合 720p 標準畫質)</option>
                <option value="4000">4000 kbps (4 Mbps - 適合 1080p 高清)</option>
                <option value="8000">8000 kbps (8 Mbps - 超高清高位元率)</option>
                <option value="custom">🛠️ 自訂輸入指定碼率...</option>
              </select>

              {bitrateMode === 'custom' && (
                <div className="flex gap-1 items-center">
                  <input
                    type="number"
                    value={customBitrate === 'auto' ? '2000' : customBitrate}
                    onChange={(e) => setCustomBitrate(e.target.value)}
                    className="w-24 px-2 py-1 border rounded text-center text-sm focus:ring-blue-500 focus:border-blue-500"
                    min="100"
                    max="50000"
                  />
                  <span className="text-sm text-gray-500">kbps</span>
                </div>
              )}
            </div>
          </div>

          {/* 5. 移除音訊控制項 */}
          <div className="flex items-center">
            <input type="checkbox" id="stripAudio" checked={stripAudio} disabled={!videoMeta.hasAudio} onChange={(e) => setStripAudio(e.target.checked)} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
            <label htmlFor="stripAudio" className="ml-2 text-sm text-gray-900">
              移除音訊軌 {!videoMeta.hasAudio && <span className="text-gray-400 text-xs">（原始影片無音訊）</span>}
            </label>
          </div>

          {/* 6. 數據報告面板（同步呈現輸入與輸出規格） */}
          <div className="bg-gray-50 p-3 rounded text-sm space-y-1.5 border border-gray-100">
            <p className="text-gray-600">⏱️ 影片長度：<span className="font-semibold text-gray-900">{videoMeta.duration.toFixed(1)} 秒</span></p>
            {/* 🛠️ 顯示使用者輸入影片的資訊 */}
            <p className="text-gray-600">📝 原始編碼：<span className="font-semibold text-blue-600">{videoMeta.codec || '解析中...'}</span></p>
            <p className="text-gray-600">📊 原始總碼率：<span className="font-semibold text-blue-600">{videoMeta.bitrate || '計算中...'}</span></p>
            <hr className="my-1 border-gray-200" />
            <p className="text-gray-600">📐 預計解析度：
              <span className={`font-semibold ${calcResult.isDownscaled ? 'text-amber-600' : 'text-green-600'}`}>
                {calcResult.resolutionName} {calcResult.isDownscaled && '(已自動降階優化)'}
              </span>
            </p>
            <p className="text-gray-600">📊 預計畫質評級：<span className="font-semibold text-gray-900">{calcResult.qualityRating}</span></p>
            {/* 🛠️ 顯示預計輸出的碼率 */}
            <p className="text-gray-600">⚡ 預計視訊碼率：
              <span className="font-semibold text-purple-600">
                {customBitrate === 'auto' ? `${Math.round(calcResult.videoBitrate / 1024)} kbps (智慧調配)` : `${customBitrate} kbps (手動鎖定)`}
              </span>
            </p>
          </div>

          {/* 7. 動作按鈕 */}
          <div className="flex gap-4">
            <button onClick={() => handleCompress(1.0)} disabled={status === 'processing'} className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:bg-gray-400 font-medium transition">
              {status === 'processing' ? '⚡ 轉碼中...' : '開始壓縮'}
            </button>
            <button onClick={handleClear} className="bg-red-100 text-red-700 py-2 px-4 rounded hover:bg-red-200 font-medium transition">清除重置</button>
          </div>
        </div>
      )}

      {/* 8. 狀態顯示與強制下載 */}
      {status === 'overshoot' && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded text-sm text-amber-700 space-y-3">
          <p>⚠️ 碼率暴走！產出大小 <strong>{realOutputSizeMB.toFixed(2)} MB</strong> 高於目標 {targetSize}MB。</p>
          <div className="flex gap-2">
            <button onClick={() => handleCompress(0.82)} className="bg-amber-600 text-white px-3 py-1.5 rounded text-xs hover:bg-amber-700 font-medium transition">
              🔄 降碼重試 (以 82% 碼率重壓)
            </button>
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
