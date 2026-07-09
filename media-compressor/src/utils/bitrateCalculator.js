// src/utils/bitrateCalculator.js

/**
 * 智慧碼率與解析度互鎖計算器
 * @param {number} targetSizeMB - 使用者期望的檔案大小 (MB)
 * @param {number} duration - 影片總長度 (秒)
 * @param {boolean} hasAudio - 原始影片是否含有音訊
 * @param {boolean} shouldStripAudio - 使用者是否勾選移除音訊
 * @param {string} userSelectedResolution - 使用者原本選取的解析度 ('1080p', '720p', '480p')
 * @returns {Object} 計算結果與降階建議
 */
export function calculateBitrateAndResolution({
  targetSizeMB,
  duration,
  hasAudio,
  shouldStripAudio,
  userSelectedResolution = '1080p'
}) {
  // 1. 安全緩衝：保留 10% 的空間給 MP4 容器封裝（Overhead），以 90% 容量為實質目標
  const safeTargetSizeMB = targetSizeMB * 0.9;

  // 2. 計算總目標碼率 (kbps)
  const totalTargetBitrateKbps = (safeTargetSizeMB * 1024 * 8) / duration;

  // 3. 扣除音訊碼率
  // 如果影片有聲音且使用者「沒有」勾選移除，扣除 128kbps；否則為 0
  const audioBitrateKbps = (hasAudio && !shouldStripAudio) ? 128 : 0;
  let videoBitrateKbps = totalTargetBitrateKbps - audioBitrateKbps;

  // 防禦機制：如果影片極長導致碼率變負數，強制給予最低底線 150kbps
  if (videoBitrateKbps < 150) {
    videoBitrateKbps = 150;
  }

  // 4. 自動降階演算法 (Auto-Downscaling)
  // 解析度與安全碼率底線對照
  const BITRATE_FLOORS = {
    '1080p': 1500,
    '720p': 800,
    '480p': 400
  };

  let finalResolution = userSelectedResolution;
  let isDownscaled = false;

  // 檢查當前碼率是否低於所選解析度的底線，若是則自動降階
  if (finalResolution === '1080p' && videoBitrateKbps < BITRATE_FLOORS['1080p']) {
    finalResolution = '720p';
    isDownscaled = true;
  }

  if (finalResolution === '720p' && videoBitrateKbps < BITRATE_FLOORS['720p']) {
    finalResolution = '480p';
    isDownscaled = true;
  }

  // 5. 對應解析度的寬高設定（假設原始為 16:9）
  const resolutionMap = {
    '1080p': { width: 1920, height: 1080 },
    '720p': { width: 1280, height: 720 },
    '480p': { width: 854, height: 480 }
  };

  // 6. 評估最終畫質評級
  let qualityRating = '極佳';
  if (videoBitrateKbps < 400) qualityRating = '極差（強烈建議調大目標容量）';
  else if (videoBitrateKbps < 700) qualityRating = '輕微馬賽克';
  else if (videoBitrateKbps < 1200) qualityRating = '可接受';
  else if (videoBitrateKbps < 2000) qualityRating = '良好';

  return {
    videoBitrate: Math.round(videoBitrateKbps * 1000), // 轉回 WebCodecs 需要的 bps
    audioBitrate: Math.round(audioBitrateKbps * 1000), // 轉回 bps
    resolution: resolutionMap[finalResolution],
    resolutionName: finalResolution,
    qualityRating,
    isDownscaled
  };
}
