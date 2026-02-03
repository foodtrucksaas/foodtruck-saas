import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  base: '/client/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'FoodTruck - Commander',
        short_name: 'FoodTruck',
        description: 'Commandez auprès de votre food truck préféré',
        theme_color: '#ed7b20',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/client/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webp}'],
        // Offline fallback
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          // Cache Supabase images (static assets)
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Cache menu data with Network-first (show fresh, fall back to cache)
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/menu_items.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'menu-data',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 5, // Fall back to cache after 5s
            },
          },
          // Cache foodtruck data
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/foodtrucks.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'foodtruck-data',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 5,
            },
          },
          // Cache categories
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/categories.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'category-data',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 5,
            },
          },
          // Cache schedules and locations
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/(schedules|locations).*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'schedule-data',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 5,
            },
          },
          // Cache offers (short TTL since they change)
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/offers.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'offers-data',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 3,
            },
          },
          // Cache Google Fonts
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Optimize assets
    assetsInlineLimit: 4096, // Inline assets < 4KB as base64
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime - cached long-term
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Supabase client - separate chunk for auth/db
          supabase: ['@supabase/supabase-js'],
          // Leaflet/Map - heavy library, only needed on info tab
          leaflet: ['leaflet', 'react-leaflet'],
          // Sentry - monitoring, can load async
          sentry: ['@sentry/react'],
        },
        // Optimize asset file names for caching
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          // Use content hash for images to enable long-term caching
          if (/\.(png|jpe?g|svg|gif|webp|avif|ico)$/i.test(assetInfo.name || '')) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
  },
});
