import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/__tests__/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/components/**/*.tsx', 'src/contexts/**/*.tsx', 'src/lib/**/*.ts'],
    },
  },
  css: {
    // Disable PostCSS processing in tests to avoid lightningcss native binary issues in CI
    postcss: '',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@pandamarket/types': path.resolve(__dirname, '../packages/types/src/index.ts'),
    },
  },
});
