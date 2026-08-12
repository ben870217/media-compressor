/**
 * Unit tests for detectVideoSourceType and outputDimensions
 * Run: docker exec -w /app/media-compressor media-compressor-dev npm run test:unit
 */

import {
  defaultSettings,
  detectVideoSourceType,
  effectiveVideoSettings,
  inferBitrateMode,
  isAudioBufferSilent,
  normalizeSampleTimestamp,
  outputDimensions,
  sparseAudioSampleTimestamps,
  videoSettingsComparison,
  videoConversionOptions,
} from '../mediaSettings.js';

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  OK ' + name); passed++; }
  catch(e) { console.error('  FAIL ' + name + '\n     ' + e.message); failed++; }
}
function eq(a, b) {
  if (JSON.stringify(a) !== JSON.stringify(b))
    throw new Error('Expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a));
}

console.log('\n-- detectVideoSourceType --');
test('portrait 9:16 -> mobile', () => eq(detectVideoSourceType({width:1080,height:1920}), 'mobile'));
test('16:9 1080p 30fps -> mobile', () => eq(detectVideoSourceType({width:1920,height:1080,fps:30}), 'mobile'));
test('16:9 1080p 60fps (OBS recording) -> screen', () => eq(detectVideoSourceType({width:1920,height:1080,fps:60}), 'screen'));
test('2K 2560x1440 -> screen', () => eq(detectVideoSourceType({width:2560,height:1440}), 'screen'));
test('4K 3840x2160 -> screen', () => eq(detectVideoSourceType({width:3840,height:2160}), 'screen'));
test('16:10 1920x1200 -> screen', () => eq(detectVideoSourceType({width:1920,height:1200}), 'screen'));
test('ultrawide 3440x1440 (ratio 2.39) -> screen', () => eq(detectVideoSourceType({width:3440,height:1440}), 'screen'));
test('zero dimensions -> mobile', () => eq(detectVideoSourceType({width:0,height:0}), 'mobile'));

console.log('\n-- defaultSettings --');
test('defaultSettings("video") includes sourceType: "auto"', () => {
  const defaults = defaultSettings('video');
  eq(defaults.sourceType, 'auto');
});

test('defaultSettings("video") uses AV1 encoding by default', () => {
  const defaults = defaultSettings('video');
  eq(defaults.format, 'av1');
});

console.log('\n-- effectiveVideoSettings --');
test('screen recording defaults to original resolution, 30 FPS, and 5s GOP', () => {
  const effective = effectiveVideoSettings(
    { ...defaultSettings('video'), sourceType: 'screen' },
    {},
    { sourceFps: 60 },
  );
  eq(
    {
      longEdge: effective.longEdge,
      fps: effective.fps,
      keyframeInterval: effective.keyframeInterval,
      bitrateMode: effective.bitrateMode,
      audioBitrate: effective.audioBitrate,
    },
    {
      longEdge: 'original',
      fps: '30',
      keyframeInterval: 5,
      bitrateMode: 'variable',
      audioBitrate: 64000,
    },
  );
});
test('screen recording preserves explicit encoding overrides', () => {
  const effective = effectiveVideoSettings(
    { ...defaultSettings('video'), sourceType: 'screen' },
    {
      fps: '60',
      keyframeInterval: 2,
      bitrateMode: 'constant',
      audioBitrate: 96000,
    },
    { sourceFps: 60 },
  );
  eq(
    {
      fps: effective.fps,
      keyframeInterval: effective.keyframeInterval,
      bitrateMode: effective.bitrateMode,
      audioBitrate: effective.audioBitrate,
    },
    {
      fps: '60',
      keyframeInterval: 2,
      bitrateMode: 'constant',
      audioBitrate: 96000,
    },
  );
});
test('mobile recording does not receive screen recording defaults', () => {
  const effective = effectiveVideoSettings(
    { ...defaultSettings('video'), sourceType: 'mobile' },
    {},
    { sourceFps: 60 },
  );
  eq(
    {
      longEdge: effective.longEdge,
      fps: effective.fps,
      hasKeyframeInterval: 'keyframeInterval' in effective,
    },
    { longEdge: 1080, fps: 'original', hasKeyframeInterval: false },
  );
});
test('auto-detected high-FPS screen recording receives screen defaults', () => {
  const effective = effectiveVideoSettings(
    defaultSettings('video'),
    {},
    { detectedSourceType: 'screen', sourceFps: 60 },
  );
  eq(
    {
      sourceType: effective.sourceType,
      fps: effective.fps,
      keyframeInterval: effective.keyframeInterval,
    },
    { sourceType: 'screen', fps: '30', keyframeInterval: 5 },
  );
});
test('low-FPS screen recording keeps its original frame rate', () => {
  const effective = effectiveVideoSettings(
    { ...defaultSettings('video'), sourceType: 'screen' },
    {},
    { sourceFps: 25 },
  );
  eq(
    { fps: effective.fps, keyframeInterval: effective.keyframeInterval },
    { fps: 'original', keyframeInterval: 5 },
  );
});

console.log('\n-- videoConversionOptions --');
test('maps the internal GOP setting to mediabunny keyFrameInterval', () => {
  const options = videoConversionOptions(
    {
      format: 'avc',
      fit: 'contain',
      fps: '30',
      keyframeInterval: 5,
    },
    { width: 1920, height: 1080 },
    2_000_000,
  );
  eq(options, {
    codec: 'avc',
    bitrate: 2_000_000,
    width: 1920,
    height: 1080,
    fit: 'contain',
    frameRate: 30,
    keyFrameInterval: 5,
  });
});
test('passes the selected bitrate mode to the video encoder options', () => {
  const options = videoConversionOptions(
    {
      format: 'avc',
      fit: 'contain',
      fps: '30',
      bitrateMode: 'variable',
    },
    { width: 1920, height: 1080 },
    2_000_000,
  );
  eq(options.bitrateMode, 'variable');
});

console.log('\n-- media sample timestamps --');
test('clamps video decoder timestamps below zero before encoding', () => {
  const sample = {
    timestamp: -0.05791383219954648,
    setTimestamp(value) { this.timestamp = value; },
  };
  normalizeSampleTimestamp(sample);
  eq(sample.timestamp, 0);
});
test('clamps audio decoder timestamps below zero before encoding', () => {
  const sample = {
    timestamp: -0.05791383219954648,
    setTimestamp(value) { this.timestamp = value; },
  };
  normalizeSampleTimestamp(sample);
  eq(sample.timestamp, 0);
});
test('preserves non-negative decoder timestamps', () => {
  const sample = {
    timestamp: 1.25,
    setTimestamp() { throw new Error('setTimestamp should not be called'); },
  };
  normalizeSampleTimestamp(sample);
  eq(sample.timestamp, 1.25);
});

console.log('\n-- video settings comparison --');
test('pairs source parameters with the effective screen recommendation', () => {
  eq(
    videoSettingsComparison(
      { fps: 60, keyframeInterval: 2, bitrateMode: 'constant', audioBitrate: 128000 },
      { fps: '30', keyframeInterval: 5, bitrateMode: 'variable', audioBitrate: 64000 },
    ),
    [
      { key: 'fps', label: 'FPS', sourceValue: 60, recommendedValue: '30' },
      { key: 'keyframeInterval', label: 'Keyframe Interval', sourceValue: 2, recommendedValue: 5 },
      { key: 'bitrateMode', label: 'Bitrate Mode', sourceValue: 'constant', recommendedValue: 'variable' },
      { key: 'audioBitrate', label: 'Audio Bitrate', sourceValue: 128000, recommendedValue: 64000 },
    ],
  );
});
test('infers constant bitrate when peak and average rates are close', () => {
  eq(inferBitrateMode({ averageBitrate: 1_000_000, peakBitrate: 1_100_000 }), 'constant');
});
test('infers variable bitrate when peak rate is materially higher', () => {
  eq(inferBitrateMode({ averageBitrate: 1_000_000, peakBitrate: 2_000_000 }), 'variable');
});
test('does not guess a bitrate mode without both source rates', () => {
  eq(inferBitrateMode({ averageBitrate: null, peakBitrate: 2_000_000 }), 'unknown');
});

console.log('\n-- sparse audio silence detection --');
test('uses five ordered timestamps across the media duration', () => {
  eq(sparseAudioSampleTimestamps(100), [0, 25, 50, 75, 99.99]);
});
test('classifies sampled PCM below the threshold as silent', () => {
  const buffer = {
    numberOfChannels: 2,
    getChannelData: (channel) => channel === 0
      ? new Float32Array([0, 0.00001])
      : new Float32Array([-0.00001, 0]),
  };
  eq(isAudioBufferSilent(buffer), true);
});
test('classifies sampled PCM above the threshold as audible', () => {
  const buffer = {
    numberOfChannels: 1,
    getChannelData: () => new Float32Array([0, 0.01]),
  };
  eq(isAudioBufferSilent(buffer), false);
});

console.log('\n-- outputDimensions (longEdge: "original") --');
// 螢幕錄影 1:1 點對點：longEdge:'original' 不進行任何縮放
test('1920x1080 passthrough, no scale', () => eq(outputDimensions({width:1920,height:1080,longEdge:'original'}), {width:1920,height:1080}));
test('2560x1440 passthrough, no scale', () => eq(outputDimensions({width:2560,height:1440,longEdge:'original'}), {width:2560,height:1440}));
test('even=true strips odd pixel', () => eq(outputDimensions({width:1921,height:1081,longEdge:'original',even:true}), {width:1920,height:1080}));
test('small source stays small (no upscale)', () => eq(outputDimensions({width:854,height:480,longEdge:'original'}), {width:854,height:480}));

console.log('\n-- outputDimensions (numeric longEdge) --');
// longEdge 數字代表「長邊上限」：1920x1080 的長邊是 1920，超過 1080 會縮至 1080 (高度 607)
test('1920x1080 longEdge:1080 -> downscale long edge (1920->1080)', () => eq(outputDimensions({width:1920,height:1080,longEdge:1080}), {width:1080,height:607}));
test('3840x2160 longEdge:1080 -> downscale long edge', () => eq(outputDimensions({width:3840,height:2160,longEdge:1080}), {width:1080,height:607}));
test('640x360 longEdge:1080 -> no upscale, stays 640x360', () => eq(outputDimensions({width:640,height:360,longEdge:1080}), {width:640,height:360}));

console.log('\n' + '-'.repeat(50));
console.log('Total: ' + (passed+failed) + '  Passed: ' + passed + '  Failed: ' + failed);
if (failed > 0) process.exit(1);
