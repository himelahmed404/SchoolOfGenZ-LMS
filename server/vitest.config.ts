import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Each test file opens its own database, and the embedded one takes a moment to start.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
