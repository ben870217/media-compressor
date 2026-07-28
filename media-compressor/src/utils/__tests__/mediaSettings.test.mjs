/**
 * Unit tests for detectVideoSourceType and outputDimensions
 * Run: docker exec -w /app/media-compressor media-compressor-dev node src/utils/__tests__/mediaSettings.test.mjs
 */

import { detectVideoSourceType, outputDimensions, defaultSettings } from '../mediaSettings.js';

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

