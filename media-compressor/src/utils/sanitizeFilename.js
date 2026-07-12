/**
 * 智慧型檔案名稱字元過濾器 (Sanitizer)
 * 專門清洗 Windows / Mac / Linux 作業系統不允許的非法檔名欄位
 * * @param {string} input - 使用者在輸入框中輸入的原始檔名
 * @returns {string} 清洗過後、100% 可安全用於作業系統儲存的檔名
 */
export function sanitizeFilename(input) {
  if (typeof input !== 'string') return '';

  // 1. 定義主要作業系統的禁忌字元：
  // / (斜線 - Unix/Mac/Win 路徑分隔)
  // \ (反斜線 - Windows 路徑分隔)
  // : (冒號 - Windows 磁碟機、Mac 資源分叉)
  // * (星號 - 通配符)
  // ? (問號 - 通配符)
  // " (雙引號 - 系統保留)
  // < (小於 - 串流導向)
  // > (大於 - 串流導向)
  // | (管線 - 核心管道)
  const forbiddenCharsRegex = /[/\\:*?"<>|]/g;

  // 2. 執行即時替換，將所有禁忌字元強制轉為底線 '_'
  let sanitized = input.replace(forbiddenCharsRegex, '_');

  // 3. 進階防禦：移除不可見的系統控制字元 (ASCII 0-31 以及 127)
  // 這些字元如果存在於檔名中，會導致 Windows 檔案總管或 Mac Finder 發生預期外的損毀
  // eslint-disable-next-line no-control-regex -- control characters are intentionally removed from filenames.
  const controlCharsRegex = /[\x00-\x1F\x7F]/g;
  sanitized = sanitized.replace(controlCharsRegex, '');

  return sanitized;
}
