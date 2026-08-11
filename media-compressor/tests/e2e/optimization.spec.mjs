import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const fixturePath = fileURLToPath(new URL('../fixtures/mac-h264-aac.mov', import.meta.url));

async function queueMacMov(page, { sourceType } = {}) {
  await page.goto('/');
  if (sourceType) await page.locator(`#source-type-${sourceType}`).click();

  await page.locator('input.batch-file-input').setInputFiles(fixturePath);
  const item = page.locator('.queue-item').filter({ hasText: 'mac-h264-aac.mov' }).first();
  await expect(item).toBeVisible();
  await expect(item.locator('.status')).toHaveText('等待中');
  await expect(item.getByText(/320 × 180/)).toBeVisible();
  return item;
}

async function forceGarbageCollection(page) {
  const hasGarbageCollector = await page.evaluate(() => typeof window.gc === 'function');
  if (!hasGarbageCollector) throw new Error('Chromium test must expose window.gc for resource-leak assertions.');
  await page.evaluate(async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      window.gc();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });
  await page.waitForTimeout(500);
}

function captureVideoSampleErrors(page) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().includes('VideoSample was garbage collected')) {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    if (error.message.includes('VideoSample was garbage collected')) errors.push(error.message);
  });
  return errors;
}

test('queues an H.264/AAC QuickTime MOV and reads its metadata', async ({ page }) => {
  const item = await queueMacMov(page);

  await expect(item).toContainText('系統偵測：手機錄影');
  await expect(item).not.toContainText('Chrome 無法讀取此影片的 metadata');
  await expect(item).not.toContainText('此瀏覽器/裝置不支援');
});

test('keeps screen comparison collapsed until requested', async ({ page }) => {
  const item = await queueMacMov(page, { sourceType: 'screen' });
  const comparison = item.locator('details.video-settings-comparison-details');

  await expect(comparison).toBeVisible();
  await expect(comparison).not.toHaveAttribute('open', '');
  await expect(comparison.locator('.video-settings-comparison')).toBeHidden();

  await comparison.locator('summary').click();
  await expect(comparison).toHaveAttribute('open', '');
  await expect(comparison.locator('.video-settings-comparison')).toBeVisible();
  await expect(comparison).toContainText('來源');
  await expect(comparison).toContainText('建議');
});

test('keeps source preview demand-loaded', async ({ page }) => {
  const item = await queueMacMov(page);
  const preview = item.locator('.media-preview').first();

  await expect(preview.getByRole('button', { name: '顯示原始檔案預覽' })).toBeVisible();
  await expect(preview.locator('video')).toHaveCount(0);

  await preview.getByRole('button', { name: '顯示原始檔案預覽' }).click();
  await expect(preview.getByRole('button', { name: '隱藏原始檔案預覽' })).toBeVisible();
  await expect(preview.locator('video')).toBeVisible();
});

test('compresses the MOV fixture to a playable MP4 in Chromium with audio removal', async ({ page }) => {
  test.setTimeout(60_000);
  const item = await queueMacMov(page);
  const resourceErrors = captureVideoSampleErrors(page);

  await page.locator('.batch-settings > .settings-grid select').selectOption('avc');
  const advanced = page.locator('.batch-settings details.advanced-settings');
  await advanced.locator('summary').click();
  await advanced.locator('input[type="checkbox"]').check();
  await page.getByRole('button', { name: '處理待處理項目' }).click();
  await expect(item.locator('.status')).toHaveText('完成', { timeout: 45_000 });

  const compressedPreview = item.locator('.result .media-preview');
  await expect(compressedPreview.getByRole('button', { name: '顯示壓縮後預覽' })).toBeVisible();
  await compressedPreview.getByRole('button', { name: '顯示壓縮後預覽' }).click();
  const outputVideo = compressedPreview.locator('video');
  await expect(outputVideo).toBeVisible();
  await expect.poll(() => outputVideo.evaluate((video) => video.readyState)).toBeGreaterThan(0);
  await forceGarbageCollection(page);
  expect(resourceErrors).toEqual([]);
});

test('does not leak VideoSamples when converting with an explicit frame rate', async ({ page }) => {
  test.setTimeout(60_000);
  const resourceErrors = captureVideoSampleErrors(page);

  const item = await queueMacMov(page, { sourceType: 'screen' });
  await page.locator('.batch-settings > .settings-grid select').selectOption('avc');
  const advanced = page.locator('.batch-settings details.advanced-settings');
  await advanced.locator('summary').click();
  await advanced.locator('label').filter({ hasText: 'FPS' }).locator('select').selectOption('30');
  await advanced.locator('input[type="checkbox"]').check();
  await page.getByRole('button', { name: '處理待處理項目' }).click();
  await expect(item.locator('.status')).toHaveText('完成', { timeout: 45_000 });
  await forceGarbageCollection(page);
  expect(resourceErrors).toEqual([]);
});

test('releases VideoSamples when conversion aborts before encoding audio', async ({ page }) => {
  test.setTimeout(60_000);
  const resourceErrors = captureVideoSampleErrors(page);
  await page.addInitScript(() => {
    window.AudioEncoder = class ForcedUnsupportedAudioEncoder {
      static isConfigSupported() {
        return new Promise((resolve) => {
          const waitForVideoSample = () => {
            const progress = document.querySelector('.queue-item progress');
            if (progress && Number(progress.value) > 0) {
              window.__videoSampleReady = true;
              resolve({ supported: false });
              return;
            }
            window.setTimeout(waitForVideoSample, 0);
          };
          waitForVideoSample();
        });
      }
    };
  });

  const item = await queueMacMov(page, { sourceType: 'screen' });
  await page.locator('.batch-settings > .settings-grid select').selectOption('avc');
  const advanced = page.locator('.batch-settings details.advanced-settings');
  await advanced.locator('summary').click();
  await advanced.locator('label').filter({ hasText: 'FPS' }).locator('select').selectOption('30');
  await page.getByRole('button', { name: '處理待處理項目' }).click();
  await expect.poll(() => page.evaluate(() => window.__videoSampleReady === true)).toBe(true);
  await expect(item.locator('.status')).toHaveText('失敗', { timeout: 45_000 });
  await forceGarbageCollection(page);
  expect(resourceErrors).toEqual([]);
});

test('releases VideoSamples when the user cancels conversion', async ({ page }) => {
  test.setTimeout(60_000);
  const resourceErrors = captureVideoSampleErrors(page);

  const item = await queueMacMov(page);
  await page.locator('.batch-settings > .settings-grid select').selectOption('avc');
  const advanced = page.locator('.batch-settings details.advanced-settings');
  await advanced.locator('summary').click();
  await advanced.locator('input[type="checkbox"]').check();
  await page.getByRole('button', { name: '處理待處理項目' }).click();
  const cancel = page.getByRole('button', { name: '取消目前並繼續' });
  await expect(cancel).toBeVisible({ timeout: 10_000 });
  await cancel.click();
  await expect(item.locator('.status')).toHaveText('已取消', { timeout: 45_000 });
  await forceGarbageCollection(page);
  expect(resourceErrors).toEqual([]);
});

test('fits the workspace at the required RWD widths', async ({ page }) => {
  for (const width of [735, 580, 480]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');

    const scrollWidth = await page.evaluate(() => Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    ));
    expect(scrollWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(width);
  }

  await expect(page.locator('.source-type-chips')).toHaveCSS('flex-direction', 'column');
});
