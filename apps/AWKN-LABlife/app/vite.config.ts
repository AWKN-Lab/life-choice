import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from 'vite-plugin-pwa'
import { inspectAttr } from 'kimi-plugin-inspect-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/life/' : '/life/',
  plugins: [
    inspectAttr(),
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
    // P2-4: PWA service worker（离线缓存静态资源，不缓存 API）
    // manifest: false 保留现有 public/manifest.json，仅由本插件注入 service worker
    // injectRegister: 'auto' 自动注入注册代码，无需手动改 main.tsx
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,jpg,jpeg,woff2}'],
        // SPA 导航回退到 index.html
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        // 不缓存 API 请求（每次走网络，保证数据新鲜）
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 8080,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/framer-motion/')) {
            return 'vendor-motion';
          }
          if (id.includes('node_modules/i18next/') || id.includes('node_modules/react-i18next/')) {
            return 'vendor-i18n';
          }
          if (id.includes('node_modules/recharts/')) {
            return 'vendor-recharts';
          }
          return undefined;
        },
      },
    },
  },
});
