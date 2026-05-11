import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'vite.svg', 'icons/*.png', 'screenshots/*.png'], // Include screenshots too
      manifest: {
        short_name: 'NoteWell AI',
        name: 'NoteWell AI',
        description: 'Generate professional SOAP notes easily from session notes.',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1976d2',
        icons: [
          {
            src: 'icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png'
          },
          {
            src: 'icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png'
          },
          {
            src: 'icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: 'icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png'
          },
          {
            src: 'icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png'
          },
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ],
        screenshots: [
          {
            src: 'screenshots/wide-1024x768.png',
            sizes: '1024x768',
            type: 'image/png',
            form_factor: 'wide'
          },
          {
            src: 'screenshots/mobile-375x667.png',
            sizes: '375x667',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,json}'],
        navigateFallback: '/index.html',  // Changed here
        navigateFallbackAllowlist: [
          new RegExp('^(?!/manifest\\.webmanifest).*$')
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ]
});
