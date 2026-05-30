import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // Map Deno-style .ts extension imports to standard TS resolution
      '../supabase.ts': path.resolve(__dirname, './pricing-engine/__mocks__/supabase.ts'),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
});
