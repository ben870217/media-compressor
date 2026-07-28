export const ASPECT_OPTIONS = [
  ['original', '原始比例'], ['16:9', '16:9'], ['9:16', '9:16'], ['1:1', '1:1'],
  ['4:3', '4:3'], ['3:4', '3:4'], ['4:5', '4:5'], ['custom', '自訂']
];

/**
 * 根據影片寬高推測影片來源類型（啟發式判定）。
 *
 * 判定規則（依優先順序）：
 * 1. 直式影片（height > width）→ 'mobile'
 * 2. 超寬螢幕（寬高比 >= 2.0，如 21:9 / 32:9）→ 'screen'
 * 3. 16:10 顯示器比例（寬高比接近 1.6，容差 ±0.02）→ 'screen'
 * 4. 2K 以上橫向（width >= 2560px）→ 'screen'
 * 5. 16:9 橫向且 60 FPS（fps >= 55，如 OBS 錄影）→ 'screen'
 * 6. 其餘（一般 16:9 等）→ 'mobile'（預設，使用者可手動切換）
 *
 * @param {{ width: number, height: number, fps?: number }} dimensions
 * @returns {'mobile' | 'screen'}
 */
export function detectVideoSourceType({ width, height, fps }) {
  if (!width || !height) return 'mobile';
  if (height > width) return 'mobile';                         // 直式：手機錄影
  const ratio = width / height;
  if (ratio >= 2.0) return 'screen';                          // 超寬螢幕 21:9 / 32:9
  if (Math.abs(ratio - 16 / 10) < 0.02) return 'screen';     // 16:10 顯示器
  if (width >= 2560) return 'screen';                         // 2K/4K 螢幕錄影
  if (Math.abs(ratio - 16 / 9) < 0.02 && fps && fps >= 55) return 'screen'; // 16:9 60fps OBS 錄影
  return 'mobile';
}

export const defaultSettings = (type) => ({
  targetSize: type === 'video' ? 10 : 1,
  longEdge: type === 'video' ? 1080 : 2048,
  format: type === 'video' ? 'avc' : 'image/jpeg',
  aspect: 'original',
  customAspect: '1:1',
  fit: 'contain',
  background: type === 'video' ? 'black' : 'white',
  force: false,
  ...(type === 'video' ? { stripAudio: false, fps: 'original', sourceType: 'auto' } : {})
});

export function parseAspect(value = 'original', custom = '1:1') {
  if (!value) return null;
  const source = value === 'custom' ? custom : value;
  if (source === 'original') return null;
  const [width, height] = source.split(':').map(Number);
  return width > 0 && height > 0 ? width / height : null;
}

export function normalizeAspect(width, height) {
  const ratio = width / height;
  const choices = [['16:9', 16 / 9], ['9:16', 9 / 16], ['1:1', 1], ['4:3', 4 / 3], ['3:4', 3 / 4], ['4:5', .8]];
  return choices.find(([, candidate]) => Math.abs(ratio - candidate) < .015)?.[0] || 'custom';
}

export function outputDimensions({ width, height, longEdge, aspect = 'original', customAspect = '1:1', even = false }) {
  const targetRatio = parseAspect(aspect, customAspect) || width / height;

  // 當 longEdge 為 'original' 時（電腦螢幕錄影 1:1 點對點保護），
  // 若比例未改變則直接回傳原始寬高，不進行任何縮放。
  if (longEdge === 'original') {
    // 若比例有改變（使用者主動選擇了不同比例），仍要套用比例裁切，
    // 但不縮小長邊（以來源尺寸為上限）。
    const sourceRatio = width / height;
    if (Math.abs(targetRatio - sourceRatio) < 0.001) {
      // 比例相同：完全 1:1 點對點
      let w = Math.max(1, Math.floor(width));
      let h = Math.max(1, Math.floor(height));
      if (even) { w -= w % 2; h -= h % 2; }
      return { width: w, height: h };
    }
    // 比例不同：在來源尺寸範圍內套用新比例
    let outputWidth, outputHeight;
    if (targetRatio >= 1) {
      outputWidth = width;
      outputHeight = outputWidth / targetRatio;
    } else {
      outputHeight = height;
      outputWidth = outputHeight * targetRatio;
    }
    const noUpscale = Math.min(1, width / outputWidth, height / outputHeight);
    outputWidth = Math.max(1, Math.floor(outputWidth * noUpscale));
    outputHeight = Math.max(1, Math.floor(outputHeight * noUpscale));
    if (even) { outputWidth -= outputWidth % 2; outputHeight -= outputHeight % 2; }
    return { width: outputWidth, height: outputHeight };
  }

  let outputWidth;
  let outputHeight;
  if (targetRatio >= 1) {
    outputWidth = Math.min(width, longEdge);
    outputHeight = outputWidth / targetRatio;
  } else {
    outputHeight = Math.min(height, longEdge);
    outputWidth = outputHeight * targetRatio;
  }
  // The output canvas itself must never exceed the source in either direction.
  // This avoids accidental upscaling when a portrait/landscape source is put in
  // a squarer or wider target frame.
  const noUpscale = Math.min(1, width / outputWidth, height / outputHeight);
  outputWidth *= noUpscale;
  outputHeight *= noUpscale;
  outputWidth = Math.max(1, Math.floor(outputWidth));
  outputHeight = Math.max(1, Math.floor(outputHeight));
  if (even) {
    outputWidth -= outputWidth % 2;
    outputHeight -= outputHeight % 2;
  }
  return { width: outputWidth, height: outputHeight };
}

export function mergedSettings(base, overrides = {}) { return { ...base, ...overrides }; }

export function changedFields(base, overrides = {}) {
  return Object.keys(overrides).filter((key) => overrides[key] !== base[key]);
}

export function isAnimatedImage(file) {
  if (file.type === 'image/gif') return true;
  return file.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    const header = new TextDecoder().decode(bytes.slice(0, 32));
    return header.startsWith('GIF') || (header.startsWith('RIFF') && header.includes('WEBP') && new TextDecoder().decode(bytes).includes('ANIM'));
  });
}
