import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioSampleSink, AudioSampleSource, EncodedPacketSink, Input, Output, BlobSource, BufferTarget, MP4, MATROSKA, WEBM, QTFF, Mp4OutputFormat, VideoSampleSink, VideoSampleSource } from 'mediabunny';
import { ASPECT_OPTIONS, changedFields, defaultSettings, detectVideoSourceType, effectiveVideoSettings, inferBitrateMode, isAnimatedImage, isAudioBufferSilent, mergedSettings, normalizeAspect, outputDimensions, sparseAudioSampleTimestamps, videoConversionOptions, videoSettingsComparison } from '../utils/mediaSettings';
import { sanitizeFilename } from '../utils/sanitizeFilename';

const MAX_FILES = 50;
const CANCELLED = 'CANCELLED_BY_USER';
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const backgroundColor = (value) => value === 'black' ? '#000000' : value === 'white' ? '#ffffff' : value === 'blur' ? 'blur' : value.startsWith('#') ? value : '#ffffff';

async function imageMeta(file) {
  if (await isAnimatedImage(file)) throw new Error('不支援 GIF 或動畫 WebP；請改用靜態 JPEG、PNG 或 WebP。');
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const meta = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return meta;
}

async function estimateKeyframeInterval(track) {
  const sink = new EncodedPacketSink(track);
  let current = await sink.getFirstKeyPacket({ metadataOnly: true });
  const intervals = [];
  for (let count = 0; current && count < 32; count++) {
    const next = await sink.getNextKeyPacket(current, { metadataOnly: true });
    if (!next) break;
    const interval = next.timestamp - current.timestamp;
    if (Number.isFinite(interval) && interval > 0) intervals.push(interval);
    current = next;
  }
  if (!intervals.length) return null;
  intervals.sort((a, b) => a - b);
  const middle = Math.floor(intervals.length / 2);
  const median = intervals.length % 2 ? intervals[middle] : (intervals[middle - 1] + intervals[middle]) / 2;
  return Number(median.toFixed(2));
}

async function videoMeta(file) {
  const url = URL.createObjectURL(file);
  let input;
  try {
    const data = await new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata'; video.src = url;
      video.onloadedmetadata = () => resolve({ width: video.videoWidth, height: video.videoHeight, duration: video.duration });
      video.onerror = () => reject(new Error('Chrome 無法讀取此影片的 metadata。MOV 內的 codec（例如 HEVC 或 ProRes）可能不受目前裝置支援；請改用 H.264 來源檔，或在支援該 codec 的裝置上重試。'));
    });
    input = new Input({ source: new BlobSource(file), formats: [MP4, QTFF, MATROSKA, WEBM] });
    try {
      const track = await input.getPrimaryVideoTrack();
      if (track) {
        const stats = await track.computePacketStats(30);
        if (stats?.averagePacketRate) {
          data.fps = Math.round(stats.averagePacketRate);
        }
        const averageBitrate = await track.getAverageBitrate();
        const peakBitrate = await track.getBitrate();
        data.videoBitrate = Number.isFinite(averageBitrate) ? averageBitrate : stats?.averageBitrate;
        data.bitrateMode = inferBitrateMode({ averageBitrate: data.videoBitrate, peakBitrate });
        try {
          data.keyframeInterval = await estimateKeyframeInterval(track);
        } catch (e) {
          console.warn('Keyframe interval estimation via mediabunny failed:', e);
        }
      }
    } catch (e) {
      console.warn('FPS estimation via mediabunny failed:', e);
    }
    try {
      const audioTrack = await input.getPrimaryAudioTrack();
      data.hasAudio = Boolean(audioTrack);
      data.isSilent = false;
      data.audioBitrate = null;
      if (audioTrack) {
        const averageBitrate = await audioTrack.getAverageBitrate();
        if (Number.isFinite(averageBitrate)) data.audioBitrate = averageBitrate;
        if (!Number.isFinite(data.audioBitrate)) {
          const stats = await audioTrack.computePacketStats(30);
          data.audioBitrate = stats?.averageBitrate || null;
        }
      }
      if (audioTrack && await audioTrack.canDecode()) {
        const sink = new AudioSampleSink(audioTrack);
        let examinedSamples = 0;
        data.isSilent = true;
        for await (const sample of sink.samplesAtTimestamps(sparseAudioSampleTimestamps(data.duration))) {
          if (!sample) continue;
          try {
            examinedSamples++;
            if (!isAudioBufferSilent(sample.toAudioBuffer())) {
              data.isSilent = false;
              break;
            }
          } finally {
            sample.close();
          }
        }
        if (!examinedSamples) data.isSilent = false;
      }
    } catch (e) {
      data.isSilent = false;
      console.warn('Audio silence detection via mediabunny failed:', e);
    }
    return data;
  } finally {
    input?.dispose();
    URL.revokeObjectURL(url);
  }
}

export default function BatchCompressor({ type, onCompressComplete }) {
  const [base, setBase] = useState(() => defaultSettings(type));
  const [items, setItems] = useState([]);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState('');
  const [draggedId, setDraggedId] = useState(null);
  const workerRef = useRef(null);
  const requests = useRef(new Map());
  const cancelCurrent = useRef(false);
  const stopAfterCurrentRef = useRef(false);
  const itemsRef = useRef([]);
  const currentItemRef = useRef(null);
  const currentRequestIdRef = useRef(null);
  const currentConversionRef = useRef(null);
  const cancelSignalRef = useRef(null);

  useEffect(() => { itemsRef.current = items; }, [items]);

  const createImageWorker = useCallback(() => {
    const worker = new Worker(new URL('../workers/imageProcessor.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      const request = requests.current.get(data.requestId);
      if (!request) return;
      requests.current.delete(data.requestId);
      if (currentRequestIdRef.current === data.requestId) currentRequestIdRef.current = null;
      data.status === 'success' ? request.resolve(data) : request.reject(new Error(data.error || data.message || '相片壓縮失敗'));
    };
    workerRef.current = worker;
  }, []);

  useEffect(() => {
    if (type !== 'image') return undefined;
    createImageWorker();
    return () => workerRef.current?.terminate();
  }, [createImageWorker, type]);

  const addFiles = async (fileList) => {
    const selected = Array.from(fileList);
    const available = MAX_FILES - items.length;
    if (!available) return setNotice('單一批次最多 50 個檔案。');
    if (selected.length > available) setNotice(`只加入前 ${available} 個檔案；單一批次最多 50 個。`);
    const accepted = selected.slice(0, available);
    const newItems = await Promise.all(accepted.map(async (file) => {
      const id = uid();
      try {
        if (file.size > 2 * 1024 ** 3) throw new Error('檔案超過 2GB 瀏覽器處理限制。');
        const meta = type === 'image' ? await imageMeta(file) : await videoMeta(file);
        const duplicate = items.some((item) => item.file.name === file.name && item.file.size === file.size) || accepted.filter((candidate) => candidate === file || (candidate.name === file.name && candidate.size === file.size)).indexOf(file) > 0;
        // 自動判定影片來源類型（手機錄影 / 電腦螢幕錄影）
        const detectedSourceType = type === 'video' ? detectVideoSourceType(meta) : undefined;
        return { id, file, meta, status: 'pending', progress: 0, overrides: {}, duplicate, result: null, error: '', detectedSourceType };
      } catch (error) { return { id, file, meta: {}, status: 'blocked', progress: 0, overrides: {}, error: error.message, duplicate: false }; }
    }));
    setItems((previous) => [...previous, ...newItems]);
  };

  const updateItem = (id, update) => setItems((previous) => {
    const next = previous.map((item) => item.id === id ? { ...item, ...update } : item);
    itemsRef.current = next;
    return next;
  });

  const effective = (item) => {
    if (type === 'video') {
      return effectiveVideoSettings(base, item.overrides, {
        detectedSourceType: item.detectedSourceType,
        sourceFps: item.meta.fps,
      });
    }
    return mergedSettings(base, item.overrides);
  };

  const updateBase = (key, value) => setBase((previous) => ({ ...previous, [key]: value }));
  const override = (item, key, value) => updateItem(item.id, { overrides: { ...item.overrides, [key]: value } });
  const resetField = (item, key) => { const next = { ...item.overrides }; delete next[key]; updateItem(item.id, { overrides: next }); };
  const resetItem = (item) => updateItem(item.id, { overrides: {} });

  const processImage = (item, settings, dimensions) => new Promise((resolve, reject) => {
    if (cancelCurrent.current) { reject(new Error(CANCELLED)); return; }
    const requestId = uid(); currentRequestIdRef.current = requestId; requests.current.set(requestId, { resolve, reject });
    workerRef.current.postMessage({ type: 'START_PRE_COMPRESSION', requestId, file: item.file, targetSizeMB: settings.targetSize, format: settings.format, dimensions, fit: settings.fit, background: backgroundColor(settings.background) });
  });

  const processVideo = async (item, settings, dimensions, attempt) => {
    const input = new Input({ source: new BlobSource(item.file), formats: [MP4, QTFF, MATROSKA, WEBM] });
    const target = new BufferTarget();
    const output = new Output({ format: new Mp4OutputFormat(), target });
    const duration = item.meta.duration || 1;
    const audioRate = settings.stripAudio ? 0 : settings.audioBitrate || 128000;
    const videoRate = Math.max(150000, Math.floor(((settings.targetSize * 1024 * 1024 * 8 * .9) / duration - audioRate) * (.82 ** attempt)));
    let cancelled = cancelCurrent.current;
    let controller = null;
    try {
      const videoTrack = await input.getPrimaryVideoTrack();
      if (!videoTrack || !(await videoTrack.canDecode())) throw new Error('此瀏覽器/裝置不支援所選影片編碼。請改用 H.264 / AVC，或降低解析度後重試。');
      const sourceAudioTrack = settings.stripAudio ? null : await input.getPrimaryAudioTrack();
      if (sourceAudioTrack && !(await sourceAudioTrack.canDecode())) throw new Error('此影片的音訊編碼無法由目前瀏覽器解碼，請改用支援 AAC 的來源檔或移除音訊。');

      const options = videoConversionOptions(settings, dimensions, videoRate);
      const frameRate = options.frameRate;
      const needsResize = item.meta.width !== dimensions.width || item.meta.height !== dimensions.height;
      const transform = {
        ...(needsResize ? { width: dimensions.width, height: dimensions.height, fit: options.fit } : {}),
        ...(frameRate === undefined ? {} : { frameRate }),
      };
      const videoSource = new VideoSampleSource({
        codec: options.codec,
        bitrate: options.bitrate,
        bitrateMode: options.bitrateMode,
        keyFrameInterval: options.keyFrameInterval,
        sizeChangeBehavior: needsResize ? 'passThrough' : undefined,
        transform: Object.keys(transform).length ? transform : undefined,
      });
      const rotation = needsResize ? 0 : await videoTrack.getRotation();
      output.addVideoTrack(videoSource, {
        ...(frameRate === undefined ? {} : { frameRate }),
        rotation,
      });

      const audioSource = sourceAudioTrack ? new AudioSampleSource({ codec: 'aac', bitrate: audioRate, bitrateMode: settings.bitrateMode }) : null;
      if (audioSource) output.addAudioTrack(audioSource);

      controller = {
        cancel: async () => {
          cancelled = true;
          return output.cancel();
        },
      };
      currentConversionRef.current = controller;
      if (cancelled || cancelCurrent.current) {
        await controller.cancel();
        throw new Error(CANCELLED);
      }

      await output.start();
      const processVideoSamples = async () => {
        const sink = new VideoSampleSink(videoTrack);
        try {
          for await (const sample of sink.samples()) {
            try {
              if (cancelled) return;
              await videoSource.add(sample);
              if (currentItemRef.current?.id === item.id && !cancelCurrent.current) {
                const progress = Math.min(1, (sample.timestamp + sample.duration) / duration);
                updateItem(item.id, { progress: Math.round(progress * 100) });
              }
            } finally {
              sample.close();
            }
          }
        } finally {
          if (!cancelled) videoSource.close();
        }
      };
      const processAudioSamples = async () => {
        const sink = new AudioSampleSink(sourceAudioTrack);
        try {
          for await (const sample of sink.samples()) {
            try {
              if (cancelled) return;
              await audioSource.add(sample);
            } finally {
              sample.close();
            }
          }
        } finally {
          if (!cancelled) audioSource.close();
        }
      };
      await Promise.all([processVideoSamples(), ...(audioSource ? [processAudioSamples()] : [])]);
      if (cancelled) throw new Error(CANCELLED);
      await output.finalize();
      return new Blob([target.buffer], { type: 'video/mp4' });
    } catch (error) {
      if (cancelled) throw new Error(CANCELLED, { cause: error });
      await output.cancel().catch(() => {});
      throw error;
    } finally {
      if (currentConversionRef.current === controller) currentConversionRef.current = null;
      input.dispose();
    }
  };

  const runQueue = async (retryOnly = false) => {
    if (running) return;
    setRunning(true); stopAfterCurrentRef.current = false; setNotice(''); cancelCurrent.current = false;
    const workQueue = itemsRef.current.filter((item) => (retryOnly ? item.status === 'failed' : item.status === 'pending')).map((item) => item.id);
    while (workQueue.length) {
      const sourceId = workQueue.shift();
      if (stopAfterCurrentRef.current) break;
      const item = itemsRef.current.find((candidate) => candidate.id === sourceId);
      if (!item) continue;
      if (item.status === 'blocked') continue;
      currentItemRef.current = item;
      updateItem(item.id, { status: 'processing', progress: 0, error: '' });
      const settings = effective(item);
      const dimensions = outputDimensions({ ...item.meta, ...settings, even: type === 'video' });
      try {
        const processing = type === 'image'
          ? processImage(item, settings, dimensions).then((response) => response.blob)
          : processVideo(item, settings, dimensions, item.retryAttempt || 0);
        const cancelled = new Promise((resolve) => { cancelSignalRef.current = () => resolve({ cancelled: true }); });
        const outcome = await Promise.race([
          processing.then((result) => ({ result }), (error) => ({ error })),
          cancelled,
        ]);
        cancelSignalRef.current = null;
        if (outcome.cancelled) {
          updateItem(item.id, { status: 'cancelled', progress: 0, error: '' });
          setNotice('目前任務已取消，繼續處理下一項。');
          onCompressComplete?.({ id: uid(), timestamp: Date.now(), batchId: batchId.current, type, status: 'cancelled', filename: item.file.name, detail: '使用者取消目前項目', batchSettings: base, overrides: item.overrides });
          continue;
        }
        if (outcome.error) throw outcome.error;
        const { result } = outcome;
        const overTarget = result.size > settings.targetSize * 1024 ** 2;
        updateItem(item.id, { status: 'success', progress: 100, result: { blob: result, dimensions, overTarget } });
        if (cancelCurrent.current) setNotice('目前任務已完成，取消未生效；繼續處理下一項。');
        onCompressComplete?.({ id: uid(), timestamp: Date.now(), batchId: batchId.current, type, status: 'success', filename: item.file.name, originalSizeMB: item.file.size / 1024 ** 2, compressedSizeMB: result.size / 1024 ** 2, savedMB: (item.file.size - result.size) / 1024 ** 2, savedPercent: ((item.file.size - result.size) / item.file.size) * 100, detail: `${dimensions.width}×${dimensions.height} / ${settings.format}`, batchSettings: base, overrides: item.overrides });
        if (type === 'video' && overTarget && !item.retryAttempt && !cancelCurrent.current) {
          const retry = { ...item, id: uid(), status: 'pending', progress: 0, error: '', result: null, retryAttempt: 1, retryOf: item.id };
          setItems((previous) => { const index = previous.findIndex((candidate) => candidate.id === item.id); const next = [...previous]; next.splice(index + 1, 0, retry); itemsRef.current = next; return next; });
          workQueue.unshift(retry.id);
        }
      } catch (error) {
        if (error.message === CANCELLED || error.name === 'ConversionCanceledError') {
          updateItem(item.id, { status: 'cancelled', progress: 0, error: '' });
          setNotice('目前任務已取消，繼續處理下一項。');
          onCompressComplete?.({ id: uid(), timestamp: Date.now(), batchId: batchId.current, type, status: 'cancelled', filename: item.file.name, detail: '使用者取消目前項目', batchSettings: base, overrides: item.overrides });
        } else { updateItem(item.id, { status: 'failed', error: error.message, progress: 0 }); onCompressComplete?.({ id: uid(), timestamp: Date.now(), batchId: batchId.current, type, status: 'failed', filename: item.file.name, detail: error.message, batchSettings: base, overrides: item.overrides }); }
      } finally { cancelCurrent.current = false; cancelSignalRef.current = null; if (currentItemRef.current?.id === item.id) currentItemRef.current = null; }
    }
    setRunning(false);
  };

  const cancelCurrentTask = () => {
    const item = currentItemRef.current;
    if (!item || cancelCurrent.current) return;
    cancelCurrent.current = true;
    updateItem(item.id, { status: 'cancelling', error: '' });
    setNotice('正在取消目前任務…');
    cancelSignalRef.current?.();
    if (type === 'video') {
      currentConversionRef.current?.cancel().catch((error) => {
        updateItem(item.id, { status: 'failed', error: error.message });
        setNotice('取消轉碼時發生錯誤，請重試或移除此項目。');
      });
      return;
    }
    const requestId = currentRequestIdRef.current;
    const request = requestId && requests.current.get(requestId);
    if (requestId) requests.current.delete(requestId);
    currentRequestIdRef.current = null;
    request?.reject(new Error(CANCELLED));
    workerRef.current?.terminate();
    createImageWorker();
  };
  const batchId = useRef(uid());

  const reorder = (index, direction) => setItems((previous) => { const next = [...previous]; const target = index + direction; if (target < 0 || target >= next.length) return previous; [next[index], next[target]] = [next[target], next[index]]; return next; });
  const moveItem = (fromId, toId) => setItems((previous) => {
    const from = previous.findIndex((item) => item.id === fromId);
    const to = previous.findIndex((item) => item.id === toId);
    if (from < 0 || to < 0 || from === to) return previous;
    const next = [...previous];
    next.splice(to, 0, next.splice(from, 1)[0]);
    return next;
  });
  const download = (item) => { const url = URL.createObjectURL(item.result.blob); const link = document.createElement('a'); link.href = url; const suffix = item.retryAttempt ? `_compressed_retry-${item.retryAttempt}` : '_compressed'; link.download = `${sanitizeFilename(item.file.name.replace(/\.[^.]+$/, ''))}${suffix}.${type === 'video' ? 'mp4' : item.result.blob.type === 'image/webp' ? 'webp' : 'jpg'}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); };
  const downloadAll = () => { setNotice('瀏覽器可能要求允許多重下載。'); items.filter((item) => item.status === 'success').forEach((item, index) => setTimeout(() => download(item), index * 250)); };
  const activeSettings = useMemo(() => ({ ...base }), [base]);

  // 全域來源類型切換（同步更新 base.sourceType）
  const updateBaseSourceType = (value) => {
    setBase((previous) => ({ ...previous, sourceType: value }));
  };

  return <div className="batch-workspace">
    <h2>{type === 'video' ? '🎥 影片批次壓縮' : '📸 相片批次壓縮'}</h2>
    <p className="batch-subtitle">每批最多 50 個；依序處理。相同來源會保留並標示重複。</p>
    {type === 'video' && (
      <div className="source-type-switcher">
        <span className="source-type-label">影片來源類型</span>
        <div className="source-type-chips">
          <button
            type="button"
            id="source-type-mobile"
            className={`source-chip ${base.sourceType === 'mobile' ? 'active' : ''}`}
            onClick={() => updateBaseSourceType('mobile')}
          >
            📱 手機錄影
          </button>
          <button
            type="button"
            id="source-type-screen"
            className={`source-chip ${base.sourceType === 'screen' ? 'active' : ''}`}
            onClick={() => updateBaseSourceType('screen')}
          >
            💻 電腦螢幕錄影
          </button>
        </div>
        <span className="source-type-hint">
          {base.sourceType === 'screen'
            ? '螢幕錄影模式：預設維持原始解析度 + 30 FPS，保護文字清晰度。'
            : '手機錄影模式：依目標容量自動調整解析度與位元率。'}
        </span>
      </div>
    )}
    <label className="batch-drop">
      <input className="batch-file-input" type="file" multiple accept={type === 'video' ? '.mp4,.mov,.mkv,.webm' : 'image/jpeg,image/png,image/webp,image/gif'} onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }} />
      <span className="batch-file-picker">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14.5v3.25A2.25 2.25 0 0 0 7.25 20h9.5A2.25 2.25 0 0 0 19 17.75V14.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        選擇{type === 'video' ? '影片' : '相片'}檔案
      </span>
      <span className="batch-file-hint">或將檔案拖放到這裡（最多 50 個）</span>
    </label>
    {notice && <p className="batch-notice">{notice}</p>}
    <section className="batch-settings"><h3>批次共用設定</h3><Settings settings={activeSettings} type={type} onChange={updateBase} fields="primary" /><details className="advanced-settings"><summary>進階設定 <span>{advancedSummary(activeSettings, type)}</span></summary><Settings settings={activeSettings} type={type} onChange={updateBase} fields="advanced" /></details></section>
    {items.length > 0 && <>
      <div className="queue-actions"><span>{items.length}/50 個檔案</span><button onClick={() => runQueue() } disabled={running}>處理待處理項目</button><button onClick={() => runQueue(true)} disabled={running || !items.some((item) => item.status === 'failed')}>重試失敗項目</button>{running && <><button onClick={() => { stopAfterCurrentRef.current = true; }}>目前完成後停止</button><button onClick={() => { void cancelCurrentTask(); }} disabled={cancelCurrent.current}>取消目前並繼續</button></>}<button onClick={downloadAll} disabled={!items.some((item) => item.status === 'success')}>全部依序下載</button></div>
      <div className="batch-queue">{items.map((item, index) => <article className={`queue-item ${item.status}`} key={item.id} draggable={!running} onDragStart={() => setDraggedId(item.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedId) moveItem(draggedId, item.id); setDraggedId(null); }}>
        <div className="queue-head"><strong>{index + 1}. {item.file.name}</strong>{item.duplicate && <em>重複來源</em>}{item.retryAttempt && <em className="retry">自動重試 {item.retryAttempt}/1</em>}<span className="status">{label(item.status)}</span></div>
        {type === 'video' && item.detectedSourceType && (
          <div className="source-type-badge-row">
            <span className={`source-type-item-badge ${item.detectedSourceType}`}>
              {item.detectedSourceType === 'screen' ? '💻 系統偵測：電腦螢幕錄影' : '📱 系統偵測：手機錄影'}
            </span>
            {!('sourceType' in item.overrides) && item.detectedSourceType !== base.sourceType && (
              <button
                type="button"
                className="source-type-override-btn"
                onClick={() => override(item, 'sourceType', item.detectedSourceType)}
              >
                ✨ 套用系統建議
              </button>
            )}
            {'sourceType' in item.overrides && (
              <button
                type="button"
                className="source-type-override-btn secondary"
                onClick={() => resetField(item, 'sourceType')}
              >
                重設來源類型
              </button>
            )}
          </div>
        )}
        {type === 'video' && item.meta.isSilent && !effective(item).stripAudio && (
          <div className="source-type-badge-row">
            <span className="source-type-item-badge">🔇 建議移除無聲音訊軌</span>
            <button type="button" className="source-type-override-btn" onClick={() => override(item, 'stripAudio', true)}>移除音訊</button>
          </div>
        )}
        {type === 'video' && effective(item).sourceType === 'screen' && (
          <VideoSettingsComparison
            source={item.meta}
            recommended={effective(item)}
            overrides={item.overrides}
            editable={!running && (item.status === 'pending' || item.status === 'failed')}
            onOverride={(key, value) => override(item, key, value)}
            onReset={(key) => resetField(item, key)}
          />
        )}
        {item.meta.width && <p>{item.meta.width} × {item.meta.height} · {normalizeAspect(item.meta.width, item.meta.height)}{item.meta.duration ? ` · ${item.meta.duration.toFixed(1)} 秒` : ''}</p>}
        <MediaPreview blob={item.file} type={type} label="原始檔案預覽" />
        {item.status === 'processing' && <progress max="100" value={item.progress} />}{item.error && <p className="error">{item.error}</p>}
        {(item.status === 'pending' || item.status === 'failed') && <details><summary>單檔覆寫{changedFields(base, item.overrides).length ? `（${changedFields(base, item.overrides).length} 項）` : ''}</summary><Settings settings={effective(item)} type={type} onChange={(key, value) => override(item, key, value)} overridden={item.overrides} onReset={(key) => resetField(item, key)} /><button className="text-button" onClick={() => resetItem(item)}>重設此檔案所有覆寫</button></details>}
        {item.result && <div className="result"><span>{item.result.dimensions.width} × {item.result.dimensions.height} · {(item.result.blob.size / 1024 ** 2).toFixed(2)} MB</span>{item.result.overTarget && <span className="warn">{item.retryAttempt ? '超過目標，已達自動重試上限。' : type === 'video' ? '超過目標，已加入自動重試 1/1。' : '超過目標容量。'}</span>}<MediaPreview blob={item.result.blob} type={type} label="壓縮後預覽" /><button onClick={() => download(item)}>下載 / 重新命名</button></div>}
        {!running && item.status !== 'processing' && <div className="reorder"><button onClick={() => reorder(index, -1)} disabled={!index}>↑</button><button onClick={() => reorder(index, 1)} disabled={index === items.length - 1}>↓</button><button onClick={() => setItems((previous) => previous.filter((candidate) => candidate.id !== item.id))}>移除</button></div>}
      </article>)}</div>
    </>}
  </div>;
}

function label(status) { return ({ pending: '等待中', processing: '處理中', cancelling: '取消中', success: '完成', failed: '失敗', blocked: '已阻擋', cancelled: '已取消' })[status] || status; }
function advancedSummary(settings, type) {
  const longEdgeLabel = settings.longEdge === 'original' ? '原始解析度' : `長邊 ${settings.longEdge}px`;
  const values = [longEdgeLabel, settings.fit === 'original' ? '原始比例' : settings.fit === 'cover' ? '裁切填滿' : '完整顯示'];
  if (type === 'video') {
    values.push(settings.fps === 'original' ? '原始 FPS' : `${settings.fps} FPS`, settings.stripAudio ? '移除音訊' : '保留音訊');
    if (settings.bitrateMode) values.push(settings.bitrateMode === 'variable' ? 'VBR' : 'CBR');
    if (settings.audioBitrate) values.push(`${Math.round(settings.audioBitrate / 1000)}k 音訊`);
  }
  return values.join(' · ');
}

function MediaPreview({ blob, type, label }) {
  const [url, setUrl] = useState(null);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const hide = () => setUrl((current) => { if (current) URL.revokeObjectURL(current); return null; });
  return <div className="media-preview">{url ? <><button type="button" onClick={hide}>隱藏{label}</button>{type === 'video' ? <video controls preload="metadata" src={url} /> : <img src={url} alt={label} />}</> : <button type="button" onClick={() => setUrl(URL.createObjectURL(blob))}>顯示{label}</button>}</div>;
}

function formatComparisonValue(key, value) {
  if (value == null || value === 'unknown') return '未偵測';
  if (key === 'fps') return value === 'original' ? '原始' : `${value} FPS`;
  if (key === 'keyframeInterval') return `${value} 秒`;
  if (key === 'bitrateMode') return value === 'variable' ? 'VBR' : value === 'constant' ? 'CBR' : value;
  if (key === 'audioBitrate') return `${Math.round(value / 1000)} kbps`;
  return String(value);
}

function comparisonOverrideValue(key, value) {
  return key === 'fps' && value != null ? String(value) : value;
}

function VideoSettingsComparison({ source, recommended, overrides = {}, editable, onOverride, onReset }) {
  const rows = videoSettingsComparison(source, recommended);
  return <section className="video-settings-comparison" aria-label="來源與建議參數對比">
    <div className="video-settings-comparison-title">來源／螢幕錄影建議參數</div>
    <div className="video-settings-comparison-grid video-settings-comparison-header" aria-hidden="true">
      <span>參數</span><span>來源</span><span>建議</span><span>動作</span>
    </div>
    {rows.map(({ key, label, sourceValue, recommendedValue }) => {
      const hasOverride = Object.prototype.hasOwnProperty.call(overrides, key);
      const canPreserveSource = sourceValue != null && sourceValue !== 'unknown';
      return <div className="video-settings-comparison-grid" key={key}>
        <span className="video-settings-comparison-label">{label}</span>
        <span>{formatComparisonValue(key, sourceValue)}</span>
        <span className={hasOverride ? 'video-settings-overridden' : ''}>{formatComparisonValue(key, recommendedValue)}</span>
        <button
          type="button"
          className="video-settings-comparison-action"
          disabled={!editable || !canPreserveSource}
          onClick={() => hasOverride ? onReset(key) : onOverride(key, comparisonOverrideValue(key, sourceValue))}
        >
          {hasOverride ? '使用建議' : '保留來源'}
        </button>
      </div>;
    })}
  </section>;
}

function Settings({ settings, type, onChange, overridden = {}, onReset, fields = 'all' }) {
  const field = (key, element) => <label className={overridden[key] !== undefined ? 'overridden' : ''}>{element}{overridden[key] !== undefined && <button type="button" className="reset" onClick={() => onReset?.(key)}>使用批次預設</button>}</label>;
  const primary = fields === 'all' || fields === 'primary';
  const advanced = fields === 'all' || fields === 'advanced';
  const isScreen = type === 'video' && settings.sourceType === 'screen';
  // 螢幕錄影且長邊被手動調降時顯示警示
  const showDownscaleWarning = isScreen && settings.longEdge !== 'original';
  return <div className="settings-grid">
    {primary && field('targetSize', <>目標容量（MB）<input type="number" min="0.1" step="0.1" value={settings.targetSize} onChange={(e) => onChange('targetSize', Math.max(.1, Number(e.target.value)))} /></>)}
    {advanced && <>{field('longEdge', <>長邊上限（px）<select value={settings.longEdge} onChange={(e) => { const v = e.target.value; onChange('longEdge', v === 'original' ? 'original' : Number(v)); }}><option value="original">原始解析度（1:1 點對點）</option><option value="3840">3840</option><option value="2048">2048</option><option value="1080">1080</option><option value="720">720</option><option value="480">480</option></select></>)}
    {showDownscaleWarning && <p className="screen-downscale-warning">⚠️ 螢幕錄影降低解析度可能導致小字與程式碼模糊，建議維持「原始解析度」。</p>}
    {field('aspect', <>輸出比例<select value={settings.aspect} onChange={(e) => onChange('aspect', e.target.value)}>{ASPECT_OPTIONS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></>)}
    {settings.aspect === 'custom' && field('customAspect', <>自訂比例<input value={settings.customAspect} onChange={(e) => onChange('customAspect', e.target.value)} placeholder="例如 5:4" /></>)}
    {field('fit', <>比例處理<select value={settings.fit} onChange={(e) => onChange('fit', e.target.value)}><option value="contain">完整顯示並加留白</option><option value="cover">裁切填滿（置中）</option><option value="original">維持原始比例</option></select></>)}
    {settings.fit === 'contain' && field('background', <>留白背景<select value={settings.background} onChange={(e) => onChange('background', e.target.value)}><option value="black">黑色</option><option value="white">白色</option><option value="blur">模糊延展</option><option value="#0066cc">自訂藍色</option></select></>)}
    {type === 'video' && <>{field('fps', <>FPS<select value={settings.fps} onChange={(e) => onChange('fps', e.target.value)}><option value="original">原始 FPS</option><option value="60">60</option><option value="30">30{isScreen ? '（螢幕錄影建議）' : ''}</option><option value="24">24</option></select></>)}{settings.keyframeInterval !== undefined && field('keyframeInterval', <>Keyframe Interval（秒）<input type="number" min="0" step="0.5" value={settings.keyframeInterval} onChange={(e) => onChange('keyframeInterval', Math.max(0, Number(e.target.value)))} /></>)}{settings.bitrateMode !== undefined && field('bitrateMode', <>Bitrate Mode<select value={settings.bitrateMode} onChange={(e) => onChange('bitrateMode', e.target.value)}><option value="variable">VBR（變動位元率）</option><option value="constant">CBR（固定位元率）</option></select></>)}{settings.audioBitrate !== undefined && field('audioBitrate', <>Audio Bitrate<select value={settings.audioBitrate} onChange={(e) => onChange('audioBitrate', Number(e.target.value))}><option value="32000">32 kbps</option><option value="64000">64 kbps（螢幕錄影建議）</option><option value="96000">96 kbps</option><option value="128000">128 kbps</option></select></>)}{field('stripAudio', <><input type="checkbox" checked={settings.stripAudio} onChange={(e) => onChange('stripAudio', e.target.checked)} />移除音訊</>)}</> }</>}
    {primary && field('format', <>輸出格式<select value={settings.format} onChange={(e) => onChange('format', e.target.value)}>{type === 'video' ? <><option value="avc">H.264 / AVC</option><option value="hevc">H.265 / HEVC</option><option value="vp9">VP9</option><option value="av1">AV1</option></> : <><option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option><option value="image/png">PNG</option></>}</select></>)}
  </div>;
}
