import { defineConfig } from 'vitest/config'

// Integration tests: a real Postgres and a real Redis.
//   pnpm test:integration   local containers (Docker is necessary)
//   pnpm test:neon          a disposable Neon branch (NEON_* variables in .env) and a Redis container
export default defineConfig(({ mode }) => {
  // The scripts select the provider with the mode (`local` itself is reserved by Vite).
  if (mode === 'test-local') process.env.TEST_DB_PROVIDER = 'local'
  if (mode === 'test-neon') process.env.TEST_DB_PROVIDER = 'neon'
  try {
    // NEON_* variables. Variables that are already set are not changed.
    process.loadEnvFile(new URL('../../.env', import.meta.url))
  } catch {
    // No .env file: the local provider does not need one.
  }

  return {
    test: {
      include: ['test/integration/**/*.test.ts'],
      globalSetup: ['test/db/global-setup.ts'],
      // The files share one database. Run them one after the other.
      fileParallelism: false,
      testTimeout: 30_000,
      hookTimeout: 300_000,
    },
  }
})
