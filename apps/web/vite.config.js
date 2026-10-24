import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Prevent Vite from loading any .env files; configuration comes from process env.
  envDir: false,
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
  },
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Handy System',
        short_name: 'Handy',
        description: 'Operations management for handyman businesses.',
        theme_color: '#122a35',
        background_color: '#f5f7f6',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/pwa-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{css,html,js,svg,woff2}'],
        globIgnores: ['**/heic2any-*.js'],
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
});
