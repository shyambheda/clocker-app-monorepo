import { defineConfig } from 'tsup'

// Bundles the API and worker into plain JS for the production image.
// Workspace packages (@repo/*) ship as TypeScript source, so they are bundled in.
export default defineConfig({
  entry: ['src/server.ts', 'src/worker.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node24',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  noExternal: [/^@repo\//],
})
