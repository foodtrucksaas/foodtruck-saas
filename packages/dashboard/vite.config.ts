import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
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
          // Recharts - heavy charting library, only needed for Analytics
          recharts: ['recharts'],
          // Sentry - monitoring, can load async
          sentry: ['@sentry/react'],
        },
        // Optimize asset file names for caching
        assetFileNames: (assetInfo) => {
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
