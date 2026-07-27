/**
 * Unit tests for detectVideoSourceType and outputDimensions
 * Run: docker exec -w /app/media-compressor media-compressor-dev node src/utils/__tests__/mediaSettings.test.mjs
 */

function detectVideoSourceType({ width, height }) {
  if (!width || !height) return 'mobile';
  if (height > width) return 'mobile';
  const ratio = width / height;
  if (ratio >= 2.0) return 'screen';
  if (Math.abs(ratio - 16 / 10) < 0.02) return 'screen';
  if (width >= 2560) return 'screen';
  return 'mobile';
}

function parseAspect(value, custom = '1:1') {
  const source = value === 'custom' ? custom : value;
  if (source === 'original') return null;
  const [w, h] = source.split(':').map(Number);
  return w > 0 && h > 0 ? w / h : null;
}

function outputDimensions({ width, height, longEdge, aspect = 'original', customAspect = '1:1', even = false }) {
  const targetRatio = parseAspect(aspect, customAspect) || width / height;
  if (longEdge === 'original') {
    const sourceRatio = width / height;
    if (Math.abs(targetRatio - sourceRatio) < 0.001) {
      let w = Math.max(1, Math.floor(width));
      let h = Math.max(1, Math.floor(height));
      if (even) { w -= w % 2; h -= h % 2; }
      return { width: w, height: h };
    }
    let outputWidth, outputHeight;
    if (targetRatio >= 1) { outputWidth = width; outputHeight = outputWidth / targetRatio; }
    else { outputHeight = height; outputWidth = outputHeight * targetRatio; }
    const noUpscale = Math.min(1, width / outputWidth, height / outputHeight);
    outputWidth = Math.max(1, Math.floor(outputWidth * noUpscale));
    outputHeight = Math.max(1, Math.floor(outputHeight * noUpscale));
    if (even) { outputWidth -= outputWidth % 2; outputHeight -= outputHeight % 2; }
    return { width: outputWidth, height: outputHeight };
  }
  let outputWidth, outputHeight;
  if (targetRatio >= 1) { outputWidth = Math.min(width, longEdge); outputHeight = outputWidth / targetRatio; }
  else { outputHeight = Math.min(height, longEdge); outputWidth = outputHeight * targetRatio; }
  const noUpscale = Math.min(1, width / outputWidth, height / outputHeight);
  outputWidth *= noUpscale; outputHeight *= noUpscale;
  outputWidth = Math.max(1, Math.floor(outputWidth));
  outputHeight = Math.max(1, Math.floor(outputHeight));
  if (even) { outputWidth -= outputWidth % 2; outputHeight -= outputHeight % 2; }
  return { width: outputWidth, height: outputHeight };
}

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
test('16:9 1080p -> mobile', () => eq(detectVideoSourceType({width:1920,height:1080}), 'mobile'));
test('2K 2560x1440 -> screen', () => eq(detectVideoSourceType({width:2560,height:1440}), 'screen'));
test('4K 3840x2160 -> screen', () => eq(detectVideoSourceType({width:3840,height:2160}), 'screen'));
test('16:10 1920x1200 -> screen', () => eq(detectVideoSourceType({width:1920,height:1200}), 'screen'));
test('ultrawide 3440x1440 (ratio 2.39) -> screen', () => eq(detectVideoSourceType({width:3440,height:1440}), 'screen'));
test('zero dimensions -> mobile', () => eq(detectVideoSourceType({width:0,height:0}), 'mobile'));

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
