import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Forked workers keep native modules and shared database clients isolated.
    // Two workers provide useful parallelism without exhausting CI services or
    // making database-backed suites race with an unbounded worker pool.
    pool: 'forks',
    maxWorkers: 2,
    minWorkers: 1,
    fileParallelism: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/services/**/*.ts'],
    },
    testTimeout: 10000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@pandamarket/types': path.resolve(__dirname, '../packages/types/src/index.ts'),
    },
  },
});
