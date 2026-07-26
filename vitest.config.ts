import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Resolves the `@/…` aliases from tsconfig.json so tests import modules the
    // same way the app does. Native since Vite 7 — no plugin needed.
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // The retrieval test builds and drops a real schema; running files in
    // parallel would let them collide.
    fileParallelism: false,
  },
});
