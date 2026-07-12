import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import packageJson from './package.json' with { type: 'json' }

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const base = env.VITE_BASE_PATH || '/media-compressor/'
  const version = env.VITE_RELEASE_VERSION || packageJson.version
  const isVersionedRelease = Boolean(env.VITE_RELEASE_VERSION)
  const channel = isVersionedRelease ? '正式版' : '預覽版'

  return {
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
    'import.meta.env.VITE_RELEASE_CHANNEL': JSON.stringify(channel),
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'pwa-icon.svg'],
      manifest: {
        id: base,
        name: isVersionedRelease ? `MediaCompressor v${version}` : 'MediaCompressor Preview',
        short_name: isVersionedRelease ? `Compressor v${version}` : 'Compressor',
        description: '在裝置本機壓縮影片與圖片的離線媒體壓縮工具。',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0066cc',
        icons: [
          {
            src: 'pwa-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{html,js,css,svg,png,webp,woff,woff2}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  base,
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
  }
})
