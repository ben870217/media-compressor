export const ASPECT_OPTIONS = [
  ['original', '原始比例'], ['16:9', '16:9'], ['9:16', '9:16'], ['1:1', '1:1'],
  ['4:3', '4:3'], ['3:4', '3:4'], ['4:5', '4:5'], ['custom', '自訂']
];

export const defaultSettings = (type) => ({
  targetSize: type === 'video' ? 10 : 1,
  longEdge: type === 'video' ? 1080 : 2048,
  format: type === 'video' ? 'avc' : 'image/jpeg',
  aspect: 'original',
  customAspect: '1:1',
  fit: 'contain',
  background: type === 'video' ? 'black' : 'white',
  force: false,
  ...(type === 'video' ? { stripAudio: false, fps: 'original' } : {})
});

export function parseAspect(value, custom = '1:1') {
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

export function outputDimensions({ width, height, longEdge, aspect, customAspect, even = false }) {
  const targetRatio = parseAspect(aspect, customAspect) || width / height;
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
