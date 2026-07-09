// src/workers/imageProcessor.js

self.onmessage = async (e) => {
  const { type, file, targetSizeMB, format = 'image/jpeg' } = e.data;

  if (type === 'START_PRE_COMPRESSION') {
    try {
      // 1. 在背景將 File/Blob 解碼為 ImageBitmap
      // { imageOrientation: 'from-image' } 會自動讀取 EXIF 並把歪斜的照片轉正！
      const bitmap = await self.createImageBitmap(file, {
        imageOrientation: 'from-image'
      });

      // 2. 初始化離屏畫布 (OffscreenCanvas)
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');

      // 將轉正後的圖片繪製到畫布上
      ctx.drawImage(bitmap, 0, 0);

      // 繪製完畢後釋放 bitmap 記憶體
      bitmap.close();

      // 3. 啟動二分搜尋法 (Binary Search) 尋找最接近目標大小的品質係數 (Quality)
      const targetSizeBytes = targetSizeMB * 1024 * 1024;
      let lowQuality = 0.01;
      let highQuality = 1.0;
      let bestQuality = 0.8;
      let bestBlob = null;
      let finalSizeMB = 0;

      // 執行 7 次迭代，精準度可達 (1/2)^7 ≈ 0.0078，對照片品質控制綽綽有餘
      for (let i = 0; i < 7; i++) {
        const midQuality = (lowQuality + highQuality) / 2;

        // 離屏畫布專用的異步編碼 API
        const blob = await canvas.convertToBlob({
          type: format,
          quality: midQuality
        });

        finalSizeMB = blob.size / (1024 * 1024);

        // 如果壓出來的大小大於目標，說明品質調太高了，往低質量方向找
        if (blob.size > targetSizeBytes) {
          highQuality = midQuality;
        } else {
          // 如果小於目標，這是一個可用的「安全解」，先記錄下來，並嘗試往高質量方向找
          lowQuality = midQuality;
          bestQuality = midQuality;
          bestBlob = blob;
        }
      }

      // 防禦機制：如果照片原本極小，即使用 quality=1.0 也達不到目標大小
      // 那就直接導出最高質量的版本
      if (!bestBlob) {
        bestBlob = await canvas.convertToBlob({ type: format, quality: 0.95 });
        finalSizeMB = bestBlob.size / (1024 * 1024);
        bestQuality = 0.95;
      }

      // 4. 將大功告成的結果與 Blob 傳回 React 主執行緒
      self.postMessage({
        status: 'success',
        finalSize: finalSizeMB,
        quality: bestQuality,
        blob: bestBlob, // 這裡的 Blob 會被封裝傳回
        width: canvas.width,
        height: canvas.height
      });

    } catch (error) {
      // 錯誤攔截，避免 Worker 崩潰導致網頁卡死
      self.postMessage({
        status: 'error',
        message: error.message
      });
    }
  }
};
