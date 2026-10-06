import { defineConfig } from 'tsup'

// Bundles the API, the worker and the migrate script into plain JS for the production image.
// Workspace packages (@repo/*) ship as TypeScript source, so they are bundled in.
// The SQL migrations (drizzle/) are not bundled: the image copies the folder (package.json `files`).
export default defineConfig({
  entry: ['src/server.ts', 'src/worker.ts', 'src/migrate.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node24',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  noExternal: [/^@repo\//],
})
