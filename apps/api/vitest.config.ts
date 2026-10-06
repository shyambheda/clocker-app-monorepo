import { defineConfig } from 'vitest/config'

// Unit tests: no network, no containers. Part of `pnpm check`.
// The integration tests have their own config (vitest.integration.config.ts).
export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.ts'],
  },
})
