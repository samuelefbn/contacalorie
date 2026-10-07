import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// `base` punta al sottopercorso di GitHub Pages (https://<utente>.github.io/contacalorie/).
// Per Firebase Hosting usa `npm run build:firebase`, che sovrascrive il base con "/".
export default defineConfig({
  base: '/contacalorie/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'ContaCalorie',
        short_name: 'ContaCalorie',
        description: 'Diario alimentare e conta calorie personale',
        lang: 'it',
        theme_color: '#059669',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Risposte di Open Food Facts: utili offline per alimenti già cercati.
            urlPattern: ({ url }) => url.hostname.endsWith('openfoodfacts.org'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'open-food-facts',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
