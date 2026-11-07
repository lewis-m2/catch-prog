import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

// The URL path the site is served from. GitHub Pages serves a project site at
// /<repo-name>/, so this must match the GitHub repo name. It is the only place
// the path is set: the asset URLs and the PWA start URL/scope all derive from it.
const BASE = '/catch-prog/';

export default defineConfig({
  base: BASE,
  define: {
    // Shown in Settings so you can tell which deploy is running on the phone.
    __BUILD_ID__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? 'local'),
  },
  plugins: [
    react(),
    VitePWA({
      // 'prompt', not 'autoUpdate': a new version must never reload the app
      // by itself in the middle of a piece. The coach taps Reload when ready.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      workbox: {
        // Precache everything the app needs, so it runs with no network.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        cleanupOutdatedCaches: true,
      },
      manifest: {
        // Chrome identifies an installed app by this id. Don't change it:
        // existing installs would show up as a separate app.
        id: `${BASE}launch`,
        name: 'Launch — rowing coach',
        short_name: 'Launch',
        description: 'Stroke rate, stopwatches, staggered starts and crew notes for the coaching launch.',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FFFFFF',
        theme_color: '#FFFFFF',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
