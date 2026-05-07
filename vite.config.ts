import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/apple-touch-icon.png',
        'icons/icon-192.svg',
        'icons/icon-512.svg',
        'icons/apple-touch-icon.svg',
      ],
      manifest: {
        name: 'Catequesis PWA',
        short_name: 'Catequesis',
        description:
          'Aplicacion offline-first para la gestion de catequesis, asistencia, actividades y notas.',
        theme_color: '#6d5efc',
        background_color: '#f5f7ff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        lang: 'es-CO',
        categories: ['education', 'productivity'],
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})
