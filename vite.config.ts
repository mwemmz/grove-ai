import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    // Installable app + offline: the app itself is saved on the device; students' data is kept by services/storage.ts.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Grove',
        short_name: 'Grove',
        description: "Your university's own study companion, from first lecture to graduation.",
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0a1235',
        theme_color: '#0a1235',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The app shell and every screen's code. The search model (~45 MB) and its runtime are cached when first used instead.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['ml/**', 'visuals/**', '**/pdf.worker*', '**/ort-*'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && (url.pathname.startsWith('/ml/') || /\/assets\/(ort-|pdf\.worker)/.test(url.pathname)),
            handler: 'CacheFirst',
            options: { cacheName: 'grove-ml', expiration: { maxEntries: 40 } },
          },
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/visuals/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'grove-visuals', expiration: { maxEntries: 120 } },
          },
        ],
      },
    }),
  ],
})
