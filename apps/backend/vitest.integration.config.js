import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/integration/**/*.test.js'],
    setupFiles: ['./test/integration/setupEnv.js'],
    globals: false,
    testTimeout: 20_000,
    // Integration tests share one Postgres connection pool and mutate real
    // tables; running them concurrently across files risks cross-test
    // interference, so force sequential execution.
    fileParallelism: false,
  },
});
