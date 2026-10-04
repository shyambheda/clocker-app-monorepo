import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker runtime image.
  output: 'standalone',
  // Trace files from the monorepo root so workspace packages are included in the bundle.
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
  // Workspace packages ship TypeScript source.
  transpilePackages: ['@clocker/shared'],
  poweredByHeader: false,
  reactStrictMode: true,
}

export default nextConfig
