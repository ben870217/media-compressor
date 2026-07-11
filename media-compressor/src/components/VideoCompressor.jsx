// src/components/VideoCompressor.jsx
import React, { useState, useEffect } from 'react';
import {
  Conversion,
  Input,
  Output,
  BlobSource,
  BufferTarget,
  MP4,
  MATROSKA,
  WEBM,
  Mp4OutputFormat,
  LogLevel
} from 'mediabunny';
import { calculateBitrateAndResolution } from '../utils/bitrateCalculator';

export default function VideoCompressor({ onFileCleared }) {
  const [videoFile, setVideoFile] = useState(null);
  const [videoMeta, setVideoMeta] = useState({ duration: 0, hasAudio: false, codec: '', bitrate: '' });
  const [targetSize, setTargetSize] = useState(10);
  const [stripAudio, setStripAudio] = useState(false);
  const [resolution, setResolution] = useState('720p');
  const [outputCodec, setOutputCodec] = useState('avc');
  const [bitrateMode, setBitrateMode] = useState('auto');
  const [customBitrate, setCustomBitrate] = useState('auto');
  const [status, setStatus] = useState('idle');
  const [calcResult, setCalcResult] = useState(null);
  const [outputBlob, setOutputBlob] = useState(null);
  const [realOutputSizeMB, setRealOutputSizeMB] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(''); // 壓縮後的預覽 URL
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState(''); // 新增：原始影片的預覽 URL

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024 * 1024) {
      alert('檔案超過 2GB 硬限制，瀏覽器無法處理！');
      return;
    }

    setStatus('loading_meta');
    setVideoFile(file);
    setOutputBlob(null);

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = async () => {
      URL.revokeObjectURL(video.src);
      const hasAudio = video.audioTracks ? video.audioTracks.length > 0 : true;

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

  // 監聽 outputBlob 變化，自動管理壓縮後預覽 URL
  useEffect(() => {
    if (!outputBlob) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(outputBlob);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [outputBlob]);

  // 新增：監聽 videoFile 變化，自動管理原始影片預覽 URL 的生命週期
  useEffect(() => {
    if (!videoFile) {
      setOriginalPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(videoFile);
    setOriginalPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoFile]);

  const handleCompress = async (bitrateModifier = 1.0) => {
    if (!videoFile || !calcResult) return;
    setStatus('processing');
    setOutputBlob(null);

    try {
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
          codec: outputCodec,
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
    setVideoFile(null);
    setVideoMeta({ duration: 0, hasAudio: false, codec: '', bitrate: '' });
    setCalcResult(null);
    setOutputBlob(null);
    setStatus('idle');
    if (onFileCleared) onFileCleared();
  };

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

        /* 檔案卡片與內置選取器優化 */
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

        /* 核心配置層級堆疊 */
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

        /* 膠囊晶片橫列（加入嚴密的中線對齊） */
        .apple-chip-row {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }

        .apple-option-chip {
          font-family: "SF Pro Text", -apple-system, sans-serif;
          font-size: 14px;
          color: #1d1d1f;
          background-color: #ffffff;
          border: 1px solid #e0e0e0;
          border-radius: 9999px;
          padding: 8px 16px;
          height: 36px;
          box-sizing: border-box;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
        }

        .apple-option-chip.active {
          background-color: #0066cc;
          color: #ffffff;
          border-color: #0066cc;
        }

        /* 精確限縮全域 input 影響 */
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

        /* 標準全寬下拉式選單與全域大型輸入框樣式安全限縮 */
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

        /* 指南指示說明面板 */
        .apple-guide-caption {
          margin-top: 8px;
          font-family: "SF Pro Text", -apple-system, sans-serif;
          font-size: 13px;
          line-height: 1.45;
          color: #7a7a7a;
          background-color: #f5f5f7;
          padding: 12px 16px;
          border-radius: 8px;
        }

        /* 核心複選控制項目 */
        .apple-checkbox-container {
          display: inline-flex;
          align-items: center;
          cursor: pointer;
          font-size: 14px;
          color: #1d1d1f;
          user-select: none;
          padding: 4px 0;
        }

        .apple-checkbox-container input {
          margin-right: 8px;
          width: 16px;
          height: 16px;
          accent-color: #0066cc;
          cursor: pointer;
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

        .apple-report-value.blue { color: #0066cc; }
        .apple-report-value.purple { color: #864af9; }

        .apple-report-divider {
          border: 0;
          border-top: 1px solid #e0e0e0;
          margin: 10px 0;
        }

        /* 按鈕集群 */
        .apple-action-cluster {
          display: flex;
          gap: 12px;
          margin-top: 28px;
        }

        .apple-btn-main {
          flex: 1;
          font-family: "SF Pro Text", -apple-system, sans-serif;
          font-size: 16px;
          font-weight: 500;
          color: #ffffff;
          background-color: #0066cc;
          border: none;
          border-radius: 9999px;
          height: 44px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .apple-btn-main:hover { background-color: #0071e3; }
        .apple-btn-main:disabled { background-color: #d2d2d7; color: #7a7a7a; cursor: not-allowed; }
        .apple-btn-main:active { transform: scale(0.95); }

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

        /* 預覽播放器外殼（符合 Apple 劇院純黑/微圓角規範） */
        .apple-preview-player-wrapper {
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

        .apple-preview-player {
          width: 100%;
          max-height: 320px;
          display: block;
          background-color: #000000;
          outline: none;
        }

        .apple-custom-bitrate-container {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .apple-artifact-action-row {
          display: flex;
          gap: 12px;
        }

        @media (max-width: 580px) {
          .apple-compressor-workspace {
            padding: 0;
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
          .apple-option-chip {
            padding: 6px 12px;
            font-size: 13px;
            height: 32px;
          }
          .apple-chip-row {
            gap: 8px;
          }
          .apple-main-gallery input.apple-input-inline-capsule {
            flex-grow: 1;
            max-width: none !important;
            width: auto !important;
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
          .apple-preview-player {
            max-height: 220px;
          }
          .apple-artifact-card {
            padding: 16px;
            margin-top: 20px;
          }
          .apple-artifact-card button {
            width: 100% !important;
          }
          .apple-artifact-action-row {
            flex-direction: column;
            gap: 8px;
          }
        }
      `}</style>

      <h2 className="apple-compressor-title">
        <span>🎥</span> 影片硬體加速壓縮
      </h2>

      <div className="apple-file-card">
        <input type="file" accept=".mp4,.mov,.mkv" onChange={handleFileChange} />
      </div>

      {videoFile && calcResult && (
        <div className="apple-control-stack">

          {/* 新增項目：原始影片播放預覽 */}
          {originalPreviewUrl && (
            <div className="apple-field-block">
              <label className="apple-field-label">🎞️ 原始影片預覽</label>
              <div className="apple-preview-player-wrapper">
                <video src={originalPreviewUrl} controls className="apple-preview-player" />
              </div>
            </div>
          )}

          {/* 1. 目標檔案大小設定 */}
          <div className="apple-field-block">
            <label className="apple-field-label">選擇目標容量大小</label>
            <div className="apple-chip-row">
              <button type="button" onClick={() => setTargetSize(10)} className={`apple-option-chip ${targetSize === 10 ? 'active' : ''}`}>JIRA (10MB)</button>
              <input type="number" value={targetSize} onChange={(e) => setTargetSize(Number(e.target.value))} className="apple-input-inline-capsule" min="1" />
              <span className="apple-unit-text">MB</span>
            </div>
          </div>

          {/* 2. 畫質限制調整 */}
          <div className="apple-field-block">
            <label className="apple-field-label">限制最高解析度</label>
            <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="apple-select-element">
              <option value="1080p">1080p (藍光高畫質 - 適合大螢幕)</option>
              <option value="720p">720p (標準高畫質 - 適合行動裝置)</option>
              <option value="480p">480p (標清速傳 - 體積大幅縮小)</option>
            </select>
          </div>

          {/* 3. 輸出編碼格式選擇 */}
          <div className="apple-field-block">
            <label className="apple-field-label">輸出影片編碼格式 (Codec)</label>
            <select value={outputCodec} onChange={(e) => setOutputCodec(e.target.value)} className="apple-select-element">
              <option value="avc">H.264 / AVC (相容性最高)</option>
              <option value="hevc">H.265 / HEVC (高壓縮率、適合 Apple 裝置)</option>
              <option value="vp9">VP9 (Google 格式、高網頁相容性)</option>
              <option value="av1">AV1 (次世代格式、體積最小)</option>
            </select>
            <div className="apple-guide-caption">
              ℹ️ <strong>編碼指南：</strong>
              {outputCodec === 'avc' && ' 相容性完美。幾乎所有瀏覽器、手機都能直接播放，社群軟體傳輸首選。'}
              {outputCodec === 'hevc' && ' 相同畫質下比 H.264 縮小近 50% 體積。適合 Apple 生態圈，但部分舊型裝置可能無法直接預覽。'}
              {outputCodec === 'vp9' && ' 由 Google 主導的開放格式，YouTube 核心編碼。在 Chrome / Android 支援度良好。'}
              {outputCodec === 'av1' && ' 最新免授權編碼，壓縮率最高（體積最小），但轉碼非常吃重效能，處理時間較長。'}
            </div>
          </div>

          {/* 4. 自訂調整輸出碼率 */}
          <div className="apple-field-block">
            <label className="apple-field-label">調整輸出影片碼率 (Bitrate)</label>
            <div className="apple-chip-row">
              <select
                value={bitrateMode}
                onChange={(e) => {
                  const mode = e.target.value;
                  setBitrateMode(mode);
                  if (mode !== 'custom') {
                    setCustomBitrate(mode);
                  } else {
                    setCustomBitrate('2000');
                  }
                }}
                className="apple-select-element"
                style={{ flex: 1, minWidth: '200px' }}
              >
                <option value="auto">自動智慧計算 (最佳化調配)</option>
                <option value="500">500 kbps (超低畫質 - 適合文字速傳)</option>
                <option value="1000">1000 kbps (1 Mbps - 適合行動流暢)</option>
                <option value="2000">2000 kbps (2 Mbps - 適合標準畫質)</option>
                <option value="4000">4000 kbps (4 Mbps - 適合 1080p 高清)</option>
                <option value="8000">8000 kbps (8 Mbps - 超高清高位元率)</option>
                <option value="custom">🛠️ 自訂輸入指定碼率...</option>
              </select>

              {bitrateMode === 'custom' && (
                <div className="apple-custom-bitrate-container">
                  <input
                    type="number"
                    value={customBitrate === 'auto' ? '2000' : customBitrate}
                    onChange={(e) => setCustomBitrate(e.target.value)}
                    className="apple-input-inline-capsule"
                    min="100"
                    max="50000"
                  />
                  <span className="apple-unit-text">kbps</span>
                </div>
              )}
            </div>
          </div>

          {/* 5. 移除音訊控制項 */}
          <div className="apple-field-block">
            <label className="apple-checkbox-container" htmlFor="stripAudio">
              <input type="checkbox" id="stripAudio" checked={stripAudio} disabled={!videoMeta.hasAudio} onChange={(e) => setStripAudio(e.target.checked)} />
              <span>移除音訊軌 {!videoMeta.hasAudio && <span style={{ color: '#7a7a7a' }}>（原始影片無音訊）</span>}</span>
            </label>
          </div>

          {/* 6. 數據報告面板 */}
          <div className="apple-report-panel">
            <div className="apple-report-row"><span className="apple-report-label">⏱️ 影片長度</span><span className="apple-report-value">{videoMeta.duration.toFixed(1)} 秒</span></div>
            <div className="apple-report-row"><span className="apple-report-label">📝 原始編碼</span><span className="apple-report-value blue">{videoMeta.codec || '解析中...'}</span></div>
            <div className="apple-report-row"><span className="apple-report-label">📊 原始總碼率</span><span className="apple-report-value blue">{videoMeta.bitrate || '計算中...'}</span></div>
            <hr className="apple-report-divider" />
            <div className="apple-report-row"><span className="apple-report-label">📐 預計解析度</span><span className="apple-report-value" style={{ color: calcResult.isDownscaled ? '#0066cc' : '#1d1d1f' }}>{calcResult.resolutionName} {calcResult.isDownscaled && '(自動最佳化)'}</span></div>
            <div className="apple-report-row"><span className="apple-report-label">📊 預計畫質評級</span><span className="apple-report-value">{calcResult.qualityRating}</span></div>
            <div className="apple-report-row"><span className="apple-report-label">⚡ 預計視訊碼率</span><span className="apple-report-value purple">{customBitrate === 'auto' ? `${Math.round(calcResult.videoBitrate / 1024)} kbps (智慧)` : `${customBitrate} kbps (鎖定)`}</span></div>
          </div>

          {/* 7. 動作按鈕集群 */}
          <div className="apple-action-cluster">
            <button onClick={() => handleCompress(1.0)} disabled={status === 'processing'} className="apple-btn-main">
              {status === 'processing' ? '⚡ 正在處理...' : '開始壓縮'}
            </button>
            <button onClick={handleClear} className="apple-btn-secondary">清除重置</button>
          </div>
        </div>
      )}

      {/* 8. 成果工藝品面板 */}
      {status === 'overshoot' && (
        <div className="apple-artifact-card">
          <div className="apple-artifact-status" style={{ color: '#0066cc' }}>⚠️ 轉碼容量溢出</div>
          <p style={{ color: '#1d1d1f', marginBottom: '16px' }}>產出體積 <strong>{realOutputSizeMB.toFixed(2)} MB</strong> 略高於目標 {targetSize}MB。</p>

          {previewUrl && (
            <div className="apple-preview-player-wrapper">
              <video src={previewUrl} controls className="apple-preview-player" />
            </div>
          )}

          <div className="apple-artifact-action-row">
            <button onClick={() => handleCompress(0.82)} className="apple-btn-main" style={{ height: '38px', fontSize: '14px' }}>
              🔄 以 82% 碼率重壓
            </button>
            <button onClick={handleDownload} className="apple-btn-secondary" style={{ height: '38px', fontSize: '14px' }}>
              照樣下載影片
            </button>
          </div>
        </div>
      )}

      {status === 'success' && outputBlob && (
        <div className="apple-artifact-card">
          <div className="apple-artifact-status" style={{ color: '#0066cc' }}>🎉 轉碼封裝完成</div>
          <p style={{ color: '#1d1d1f', marginBottom: '16px' }}>最終精密大小：<strong>{realOutputSizeMB.toFixed(2)} MB</strong>（完美符合預期範圍）。</p>

          {previewUrl && (
            <div className="apple-preview-player-wrapper">
              <video src={previewUrl} controls className="apple-preview-player" />
            </div>
          )}

          <button onClick={handleDownload} className="apple-btn-main" style={{ width: '100%' }}>
            💾 儲存轉碼影片至本地
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="apple-artifact-card" style={{ boxShadow: 'none', borderColor: '#e0e0e0', backgroundColor: '#f5f5f7' }}>
          <div className="apple-artifact-status" style={{ color: '#1d1d1f' }}>❌ 核心管道執行中斷</div>
          <p style={{ color: '#7a7a7a', margin: 0 }}>硬體解碼失敗，可能是瀏覽器不支援該原始轉碼封裝，或檔案磁軌遺失。</p>
        </div>
      )}
    </div>
  );
}
