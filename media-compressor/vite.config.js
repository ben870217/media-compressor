import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  base: '/media-compressor/',
  server: {
    host: '0.0.0.0',   // 🔴 關鍵：允許外部（Docker 宿主機）連線進來
    port: 5173,        // 固定在 5173 port
    strictPort: true,  // 🔴 關鍵：如果 5173 被佔用就直接報錯，而不是自動跳到 5174（防止對不到 port）
    watch: {
      usePolling: true // 在 Docker/WSL 環境下，確保熱重載（HMR）檔案監聽正常運作
    }
  },
  optimizeDeps: {
    include: ['mediabunny']
  }
})
