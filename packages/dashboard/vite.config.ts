import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
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
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime - cached long-term
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Supabase client - separate chunk for auth/db
          'supabase': ['@supabase/supabase-js'],
          // Recharts - heavy charting library, only needed for Analytics
          'recharts': ['recharts'],
          // Sentry - monitoring, can load async
          'sentry': ['@sentry/react'],
        },
      },
    },
  },
});
