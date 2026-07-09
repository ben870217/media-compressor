// src/components/VideoCompressor.jsx
import React, { useState, useEffect } from 'react';
import {
  Conversion,
  Input,
  Output,
  BlobSource,
  BufferTarget,
  Mp4InputFormat,
  MatroskaInputFormat,
  IsobmffInputFormat,
  Mp4OutputFormat,
  LogLevel
} from 'mediabunny';
import { calculateBitrateAndResolution } from '../utils/bitrateCalculator';

export default function VideoCompressor({ onFileCleared }) {
  const [videoFile, setVideoFile] = useState(null);
  const [videoMeta, setVideoMeta] = useState({ duration: 0, hasAudio: false });
  const [targetSize, setTargetSize] = useState(10);
  const [stripAudio, setStripAudio] = useState(false);
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

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
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
    const result = calculateBitrateAndResolution({
      targetSizeMB: targetSize,
      duration: videoMeta.duration,
      hasAudio: videoMeta.hasAudio,
      shouldStripAudio: stripAudio,
      userSelectedResolution: '1080p'
    });
    setCalcResult(result);
  }, [targetSize, stripAudio, videoFile, videoMeta]);

  // 核心轉碼管線
  const handleCompress = async (bitrateModifier = 1.0) => {
    if (!videoFile || !calcResult) return;
    setStatus('processing');

    try {
      const finalVideoBitrate = Math.round(calcResult.videoBitrate * bitrateModifier);

      const blobSource = new BlobSource(videoFile);

      // 🟢 核心修正點：改為傳入「類別本身」而非「new 實例」
      // 這樣可以繞過部分打包工具造成的 new 實例原型鏈錯位問題
      const explicitFormats = [
        Mp4InputFormat,
        MatroskaInputFormat,
        IsobmffInputFormat
      ];

      const input = new Input(blobSource, {
        formats: explicitFormats
      });

      /* 💡 如果上面依然報錯，請將上面 6 行註解，換成下面這一行最純淨的自動偵測寫法：
      const input = new Input(blobSource);
      */

      const bufferTarget = new BufferTarget();
      const outputFormat = new Mp4OutputFormat();
      const output = new Output(bufferTarget, outputFormat);

      const conversion = new Conversion({
        input: input,
        output: output,
        log: LogLevel?.Errors || 1
      });

      await input.readHeaders();

      for (const track of input.tracks) {
        if (track.type === 'video') {
          const videoOutputTrack = output.addVideoTrack(track);
          videoOutputTrack.setCodec('avc');
          videoOutputTrack.setBitrate(finalVideoBitrate);
          videoOutputTrack.setSize(calcResult.resolution.width, calcResult.resolution.height);

        } else if (track.type === 'audio') {
          if (videoMeta.hasAudio && !stripAudio) {
            const audioOutputTrack = output.addAudioTrack(track);
            audioOutputTrack.setCodec('aac');
            audioOutputTrack.setBitrate(calcResult.audioBitrate);
          }
        }
      }

      await conversion.run();

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

  const handleClear = () => {
    if (outputBlob) URL.revokeObjectURL(outputBlob);
    setVideoFile(null);
    setVideoMeta({ duration: 0, hasAudio: false });
    setCalcResult(null);
    setOutputBlob(null);
    setStatus('idle');
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-xl font-bold">🎥 影片壓縮工具 (WebCodecs 加速)</h2>
      <input type="file" accept=".mp4,.mov,.mkv" onChange={handleFileChange} className="block w-full text-sm text-gray-500" />

      {videoFile && calcResult && (
        <div className="space-y-4 border-t pt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">選擇目標大小：</label>
            <div className="flex gap-2 mt-1">
              <button onClick={() => setTargetSize(10)} className={`px-3 py-1 rounded ${targetSize === 10 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Discord (10MB)</button>
              <button onClick={() => setTargetSize(20)} className={`px-3 py-1 rounded ${targetSize === 20 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>LINE (20MB)</button>
              <input type="number" value={targetSize} onChange={(e) => setTargetSize(Number(e.target.value))} className="w-20 px-2 py-1 border rounded text-center" min="1" />
              <span className="self-center text-sm">MB</span>
            </div>
          </div>

          <div className="flex items-center">
            <input type="checkbox" id="stripAudio" checked={stripAudio} disabled={!videoMeta.hasAudio} onChange={(e) => setStripAudio(e.target.checked)} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
            <label htmlFor="stripAudio" className="ml-2 text-sm text-gray-900">
              移除音訊軌 {!videoMeta.hasAudio && <span className="text-gray-400 text-xs">（原始影片無音訊）</span>}
            </label>
          </div>

          <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
            <p>⏱️ 影片長度：<span className="font-semibold">{videoMeta.duration.toFixed(1)} 秒</span></p>
            <p>📐 預計解析度：
              <span className={`font-semibold ${calcResult.isDownscaled ? 'text-amber-600' : 'text-green-600'}`}>
                {calcResult.resolutionName} {calcResult.isDownscaled && '(已自動降階優化)'}
              </span>
            </p>
            <p>📊 預計畫質評級：<span className="font-semibold">{calcResult.qualityRating}</span></p>
          </div>

          <div className="flex gap-4">
            <button onClick={() => handleCompress(1.0)} disabled={status === 'processing'} className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:bg-gray-400">
              {status === 'processing' ? '轉碼中...' : '開始壓縮'}
            </button>
            <button onClick={handleClear} className="bg-red-100 text-red-700 py-2 px-4 rounded hover:bg-red-200">清除重置</button>
          </div>
        </div>
      )}

      {status === 'overshoot' && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded text-sm text-amber-700 space-y-2">
          <p>⚠️ 碼率暴走！產出大小 <strong>{realOutputSizeMB.toFixed(2)} MB</strong> 超額。</p>
          <button onClick={() => handleCompress(0.85)} className="bg-amber-600 text-white px-3 py-1 rounded text-xs hover:bg-amber-700">
            🔄 啟動雙次重試機制 (降碼重壓)
          </button>
        </div>
      )}

      {status === 'success' && outputBlob && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded text-sm text-green-700">
          <p>🎉 壓縮成功！最終大小：<strong>{realOutputSizeMB.toFixed(2)} MB</strong></p>
        </div>
      )}
    </div>
  );
}
